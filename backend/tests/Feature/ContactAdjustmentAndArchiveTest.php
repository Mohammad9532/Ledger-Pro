<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Account;
use App\Models\User;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContactAdjustmentAndArchiveTest extends TestCase
{
    use DatabaseTransactions, WithoutMiddleware;

    protected User $user;
    protected TransactionService $transactionService;

    protected function setUp(): void
    {
        parent::setUp();
        
        config(['database.connections.tenant' => config('database.connections.mysql')]);
        config(['database.connections.tenant.database' => env('DB_DATABASE')]);

        $this->transactionService = $this->app->make(TransactionService::class);

        $this->user = User::first() ?? User::factory()->create(['company_id' => 1]);
        $this->token = $this->user->createToken('test')->plainTextToken;
    }

    private function createContact(): Contact
    {
        $account = Account::create([
            'name' => 'Test Person',
            'type' => 'person',
            'is_active' => true,
            'is_system' => false,
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);

        return Contact::create([
            'name' => 'Test Person',
            'account_id' => $account->id,
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);
    }

    private function createAccount(string $type): Account
    {
        return Account::create([
            'name' => "Test {$type}",
            'type' => $type,
            'is_active' => true,
            'is_system' => false,
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);
    }

    public function test_archive_with_zero_balance_succeeds()
    {
        $contact = $this->createContact();
        
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/archive");

        $response->assertStatus(200);
        $this->assertTrue($contact->fresh()->is_archived);
        $this->assertFalse($contact->fresh()->account->is_active);
    }

    public function test_archive_with_positive_balance_rejected()
    {
        $contact = $this->createContact();
        $expense = $this->createAccount('expense');
        
        // Give balance (Receivable = positive)
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 50, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
                ['account_id' => $contact->account->id, 'debit' => 50, 'credit' => 0],
                ['account_id' => $expense->id, 'debit' => 0, 'credit' => 50],
            ]
        );

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/archive");

        $response->assertStatus(422)
                 ->assertJsonPath('error', 'Cannot archive this contact because the account has an outstanding balance.');
    }

    public function test_archive_with_negative_balance_rejected()
    {
        $contact = $this->createContact();
        $income = $this->createAccount('income');
        
        // Give balance (Payable = negative)
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 50, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
                ['account_id' => $income->id, 'debit' => 50, 'credit' => 0],
                ['account_id' => $contact->account->id, 'debit' => 0, 'credit' => 50],
            ]
        );

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/archive");

        $response->assertStatus(422);
    }

    public function test_full_receivable_write_off()
    {
        $contact = $this->createContact();
        $income = $this->createAccount('income'); // To balance initial
        $expense = $this->createAccount('expense'); // To write off
        
        // Initial Receivable: 100
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 100, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
            ['account_id' => $contact->account->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $income->id, 'debit' => 0, 'credit' => 100],
        ]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/balance-adjustment", [
                'amount' => 100,
                'adjustment_type' => 'write_off',
                'account_id' => $expense->id,
            ]);

        $response->assertStatus(200);
        $this->assertEquals('0.0000', app(\App\Services\BalanceService::class)->getAccountBalance($contact->account->id));
    }

    public function test_partial_receivable_write_off()
    {
        $contact = $this->createContact();
        $income = $this->createAccount('income');
        $expense = $this->createAccount('expense');
        
        // Initial Receivable: 100
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 100, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
            ['account_id' => $contact->account->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $income->id, 'debit' => 0, 'credit' => 100],
        ]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/balance-adjustment", [
                'amount' => 40,
                'adjustment_type' => 'write_off',
                'account_id' => $expense->id,
            ]);

        $response->assertStatus(200);
        $this->assertEquals('60.0000', app(\App\Services\BalanceService::class)->getAccountBalance($contact->account->id));
    }

    public function test_full_customer_credit_release()
    {
        $contact = $this->createContact();
        $expense = $this->createAccount('expense'); 
        $income = $this->createAccount('income'); 
        
        // Initial Payable (Customer Credit): -100
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 100, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
            ['account_id' => $expense->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $contact->account->id, 'debit' => 0, 'credit' => 100],
        ]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/balance-adjustment", [
                'amount' => 100,
                'adjustment_type' => 'release_liability',
                'account_id' => $income->id,
            ]);

        $response->assertStatus(200);
        $this->assertEquals('0.0000', app(\App\Services\BalanceService::class)->getAccountBalance($contact->account->id));
    }

    public function test_restore_archived_contact()
    {
        $contact = $this->createContact();
        $contact->update(['is_archived' => true]);
        $contact->account->update(['is_active' => false]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/restore");

        $response->assertStatus(200);
        $this->assertFalse($contact->fresh()->is_archived);
        $this->assertTrue($contact->fresh()->account->is_active);
    }

    public function test_delete_rejected_with_financial_history()
    {
        $contact = $this->createContact();
        $income = $this->createAccount('income');
        
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 100, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
            ['account_id' => $contact->account->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $income->id, 'debit' => 0, 'credit' => 100],
        ]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->deleteJson("/api/contacts/{$contact->id}");

        $response->assertStatus(422)
                 ->assertJsonPath('error', 'Contacts with financial history cannot be deleted. Archive the contact instead.');
    }

    public function test_delete_allowed_with_no_financial_history()
    {
        $contact = $this->createContact();
        
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->deleteJson("/api/contacts/{$contact->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted($contact);
    }

    public function test_invalid_adjustment_account_type_rejected()
    {
        $contact = $this->createContact();
        $income = $this->createAccount('income');
        
        // Initial Receivable
        $this->transactionService->createTransaction([
            'type' => 'journal', 'amount' => 100, 'date' => now()->toDateString(), 'description' => 'Test'
        ], [
            ['account_id' => $contact->account->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $income->id, 'debit' => 0, 'credit' => 100],
        ]);

        // Attempt to write off a receivable using an income account (should fail, needs expense)
        $invalidAccount = $this->createAccount('income');
        $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->postJson("/api/contacts/{$contact->id}/balance-adjustment", [
                'amount' => 100,
                'adjustment_type' => 'write_off',
                'account_id' => $invalidAccount->id,
            ]);

        $response->assertStatus(422)
                 ->assertJsonPath('error', 'Offset account must be an expense account for receivable write-offs');
    }
}
