<?php

return [
    'accounts' => [
        ['name' => 'Cash', 'type' => 'cash'],
        ['name' => 'Bank', 'type' => 'bank'],
        ['name' => 'Accounts Receivable', 'type' => 'asset'],
        ['name' => 'Accounts Payable', 'type' => 'liability'],
        ['name' => 'Sales', 'type' => 'income'],
        ['name' => 'Purchases', 'type' => 'expense'],
        ['name' => 'Opening Balance Equity', 'type' => 'equity'],
        ['name' => 'General Income', 'type' => 'income'],
        ['name' => 'General Expense', 'type' => 'expense'],
    ],
    'income_categories' => [
        ['name' => 'General Income', 'account_name' => 'General Income'],
    ],
    'expense_categories' => [
        ['name' => 'General Expense', 'account_name' => 'General Expense'],
    ],
];
