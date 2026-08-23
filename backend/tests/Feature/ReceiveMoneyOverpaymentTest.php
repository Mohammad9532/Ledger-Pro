<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Tests\TestCase;

class ReceiveMoneyOverpaymentTest extends TestCase
{
    use DatabaseTransactions, WithoutMiddleware;

    protected User $user;
    protected Account $bank;
    protected Account $person;
    protected Account $income;
    protected Contact $contact;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.connections.tenant' => config('database.connections.mysql')]);
        config(['database.connections.tenant.database' => env('DB_DATABASE')]);

        $this->user = User::first() ?? User::factory()->create(['company_id' => 1]);
        
        $this->bank = Account::create(['name' => 'Test Bank', 'type' => 'bank', 'is_active' => true, 'opening_balance' => 0]);
        $this->person = Account::create(['name' => 'Test Customer', 'type' => 'person', 'is_active' => true, 'opening_balance' => 0]);
        $this->income = Account::create(['name' => 'Overpayment Income', 'type' => 'income', 'is_active' => true, 'opening_balance' => 0]);
        
        $this->contact = Contact::create([
            'name' => 'Test Customer',
            'account_id' => $this->person->id
        ]);
    }

    private function setPersonBalance(float $balance)
    {
        if ($balance == 0) return;

        // Debit person (receivable) if positive, Credit person (payable) if negative
        $debit = $balance > 0 ? $balance : 0;
        $credit = $balance < 0 ? abs($balance) : 0;

        // Create opening balance equity if needed
        $equity = Account::firstOrCreate(
            ['name' => 'Opening Balance Equity', 'type' => 'equity'],
            ['is_active' => true, 'opening_balance' => 0]
        );

        $txn = Transaction::create([
            'type' => 'journal',
            'date' => now()->subDay()->toDateString(),
            'amount' => abs($balance),
            'description' => 'Setup balance'
        ]);

        $txn->entries()->create(['account_id' => $this->person->id, 'debit' => $debit, 'credit' => $credit]);
        $txn->entries()->create(['account_id' => $equity->id, 'debit' => $credit, 'credit' => $debit]);
    }

    public function test_exact_payment()
    {
        $this->setPersonBalance(500);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
        ]);

        $response->assertStatus(201);
        $txn = Transaction::with('entries')->find($response->json('id'));
        $this->assertCount(2, $txn->entries);

        $bankEntry = $txn->entries->firstWhere('account_id', $this->bank->id);
        $personEntry = $txn->entries->firstWhere('account_id', $this->person->id);

        $this->assertEquals(500, $bankEntry->debit);
        $this->assertEquals(500, $personEntry->credit);
    }

    public function test_partial_payment()
    {
        $this->setPersonBalance(500);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 499,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
        ]);

        $response->assertStatus(201);
        $txn = Transaction::with('entries')->find($response->json('id'));
        $this->assertCount(2, $txn->entries);

        $this->assertEquals(499, $txn->entries->firstWhere('account_id', $this->bank->id)->debit);
        $this->assertEquals(499, $txn->entries->firstWhere('account_id', $this->person->id)->credit);
    }

    public function test_overpayment_to_customer_credit()
    {
        $this->setPersonBalance(499);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
            'overpayment_handling' => 'customer_credit'
        ]);

        $response->assertStatus(201);
        $txn = Transaction::with('entries')->find($response->json('id'));
        $this->assertCount(2, $txn->entries);

        $this->assertEquals(500, $txn->entries->firstWhere('account_id', $this->bank->id)->debit);
        $this->assertEquals(500, $txn->entries->firstWhere('account_id', $this->person->id)->credit);
    }

    public function test_overpayment_to_income()
    {
        $this->setPersonBalance(499);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
            'overpayment_handling' => 'income',
            'income_account_id' => $this->income->id
        ]);

        $response->assertStatus(201);
        $txn = Transaction::with('entries')->find($response->json('id'));
        $this->assertCount(3, $txn->entries);

        $this->assertEquals(500, $txn->entries->firstWhere('account_id', $this->bank->id)->debit);
        $this->assertEquals(499, $txn->entries->firstWhere('account_id', $this->person->id)->credit);
        $this->assertEquals(1, $txn->entries->firstWhere('account_id', $this->income->id)->credit);
    }

    public function test_overpayment_without_handling_fails()
    {
        $this->setPersonBalance(499);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_overpayment_to_income_without_income_account_fails()
    {
        $this->setPersonBalance(499);

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
            'overpayment_handling' => 'income'
        ]);

        $response->assertStatus(422);
    }

    public function test_payment_when_already_in_credit()
    {
        $this->setPersonBalance(-10); // Customer has credit of 10

        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 100, // Pays another 100
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
        ]);

        $response->assertStatus(201);
        $txn = Transaction::with('entries')->find($response->json('id'));
        $this->assertCount(2, $txn->entries);
        $this->assertEquals(100, $txn->entries->firstWhere('account_id', $this->person->id)->credit);
    }

    public function test_update_transaction_keeps_balance_safe()
    {
        $this->setPersonBalance(500);

        // First, receive 500 correctly
        $response = $this->actingAs($this->user)->postJson('/api/transactions', [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 500,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
        ]);

        $txnId = $response->json('id');

        // Now, we want to update the transaction to 510.
        // If we didn't exclude the current txn, the outstanding would be 0, and the amount 510 would be an overpayment of 510!
        // But excluding the current txn, the outstanding is 500. So overpayment is 10.
        $updateResponse = $this->actingAs($this->user)->putJson("/api/transactions/{$txnId}", [
            'type' => 'receive_money',
            'date' => now()->toDateString(),
            'amount' => 510,
            'bank_account_id' => $this->bank->id,
            'person_account_id' => $this->person->id,
            'overpayment_handling' => 'income',
            'income_account_id' => $this->income->id
        ]);

        $updateResponse->assertStatus(200);
        
        $txn = Transaction::with('entries')->find($txnId);
        $this->assertCount(3, $txn->entries);
        
        // 510 to bank
        $this->assertEquals(510, $txn->entries->firstWhere('account_id', $this->bank->id)->debit);
        // 500 to person (since outstanding without this txn was 500)
        $this->assertEquals(500, $txn->entries->firstWhere('account_id', $this->person->id)->credit);
        // 10 to income
        $this->assertEquals(10, $txn->entries->firstWhere('account_id', $this->income->id)->credit);
    }
}
