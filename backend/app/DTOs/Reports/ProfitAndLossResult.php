<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class ProfitAndLossResult implements JsonSerializable
{
    /**
     * @param ProfitAndLossRow[] $incomeRows
     * @param ProfitAndLossRow[] $expenseRows
     */
    public function __construct(
        public readonly array $incomeRows,
        public readonly array $expenseRows,
        public readonly string $totalIncome,
        public readonly string $totalExpense,
        public readonly string $netProfit,
        public readonly string $startDate,
        public readonly string $endDate,
        public readonly string $generatedAt,
        public readonly string $currency,
        public readonly string $tenant
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'income' => array_map(fn($row) => $row->jsonSerialize(), $this->incomeRows),
            'expenses' => array_map(fn($row) => $row->jsonSerialize(), $this->expenseRows),
            'total_income' => $this->totalIncome,
            'total_expense' => $this->totalExpense,
            'net_profit' => $this->netProfit,
            'period' => [
                'start' => $this->startDate,
                'end' => $this->endDate,
            ],
            'generated_at' => $this->generatedAt,
            'currency' => $this->currency,
            'tenant' => $this->tenant,
        ];
    }
}
