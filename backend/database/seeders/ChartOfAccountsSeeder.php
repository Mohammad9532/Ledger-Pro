<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;
use App\Models\IncomeCategory;
use App\Models\ExpenseCategory;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accountsConfig = config('chart_of_accounts.accounts', []);
        
        foreach ($accountsConfig as $acc) {
            Account::updateOrCreate(
                ['name' => $acc['name']],
                [
                    'type' => $acc['type'],
                    'opening_balance' => 0,
                    'is_active' => true,
                    'is_system' => true,
                ]
            );
        }

        $incomeCategories = config('chart_of_accounts.income_categories', []);
        foreach ($incomeCategories as $cat) {
            $account = Account::where('name', $cat['account_name'])->first();
            if ($account) {
                IncomeCategory::updateOrCreate(
                    ['name' => $cat['name']],
                    ['account_id' => $account->id]
                );
            }
        }

        $expenseCategories = config('chart_of_accounts.expense_categories', []);
        foreach ($expenseCategories as $cat) {
            $account = Account::where('name', $cat['account_name'])->first();
            if ($account) {
                ExpenseCategory::updateOrCreate(
                    ['name' => $cat['name']],
                    ['account_id' => $account->id]
                );
            }
        }
    }
}
