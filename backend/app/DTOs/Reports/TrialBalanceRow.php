<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class TrialBalanceRow implements JsonSerializable
{
    public function __construct(
        public readonly int $accountId,
        public readonly string $accountName,
        public readonly ?string $accountCode,
        public readonly string $accountType,
        public readonly string $debit,
        public readonly string $credit
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'account_id' => $this->accountId,
            'account_name' => $this->accountName,
            'account_code' => $this->accountCode,
            'account_type' => $this->accountType,
            'debit' => $this->debit,
            'credit' => $this->credit,
        ];
    }
}
