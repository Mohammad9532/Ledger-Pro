<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class TrialBalanceResult implements JsonSerializable
{
    /**
     * @param TrialBalanceRow[] $rows
     */
    public function __construct(
        public readonly array $rows,
        public readonly string $totalDebit,
        public readonly string $totalCredit,
        public readonly bool $isBalanced,
        public readonly string $asOfDate,
        public readonly string $generatedAt,
        public readonly string $currency,
        public readonly string $tenant
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'rows' => array_map(fn($row) => $row->jsonSerialize(), $this->rows),
            'total_debit' => $this->totalDebit,
            'total_credit' => $this->totalCredit,
            'is_balanced' => $this->isBalanced,
            'as_of' => $this->asOfDate,
            'generated_at' => $this->generatedAt,
            'currency' => $this->currency,
            'tenant' => $this->tenant,
        ];
    }
}
