<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ExpenseCategory;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create default user
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@ledger.com',
            'password' => Hash::make('password'),
        ]);

        $userId = $user->id;

        // === ACCOUNTS ===

        // Cash accounts
        Account::create(['name' => 'Cash', 'type' => 'cash', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);

        // Bank accounts
        Account::create(['name' => 'HDFC Bank', 'type' => 'bank', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);
        Account::create(['name' => 'SBI Bank', 'type' => 'bank', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);

        // Credit Cards
        Account::create(['name' => 'ICICI Credit Card', 'type' => 'credit_card', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);
        Account::create(['name' => 'HDFC Credit Card', 'type' => 'credit_card', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);

        // Income accounts
        Account::create(['name' => 'Salary Income', 'type' => 'income', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);
        Account::create(['name' => 'Sales Income', 'type' => 'income', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);
        Account::create(['name' => 'Freelance Income', 'type' => 'income', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);

        // Business account
        Account::create(['name' => 'Business Inventory', 'type' => 'business', 'opening_balance' => 0, 'is_active' => true, 'created_by' => $userId, 'updated_by' => $userId]);

        // === EXPENSE CATEGORIES ===
        $categories = ['Food', 'Fuel', 'Mobile', 'Internet', 'Travel', 'Shopping', 'Medical', 'Other'];
        foreach ($categories as $cat) {
            $expAccount = Account::create([
                'name' => $cat . ' Expense',
                'type' => 'expense',
                'opening_balance' => 0,
                'is_active' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);
            ExpenseCategory::create(['name' => $cat, 'account_id' => $expAccount->id]);
        }

        // === CONTACTS (People) ===
        $people = [
            ['name' => 'Rafey', 'phone' => '9876543210', 'notes' => 'Business partner'],
            ['name' => 'Afzal', 'phone' => '9876543211', 'notes' => 'Client'],
            ['name' => 'Salman', 'phone' => '9876543212', 'notes' => 'Supplier'],
        ];

        foreach ($people as $person) {
            $personAccount = Account::create([
                'name' => $person['name'],
                'type' => 'person',
                'opening_balance' => 0,
                'is_active' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $contact = Contact::create([
                'name' => $person['name'],
                'phone' => $person['phone'],
                'notes' => $person['notes'],
                'account_id' => $personAccount->id,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $personAccount->update(['contact_id' => $contact->id]);
        }
    }
}
