<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class CashFlowRow implements JsonSerializable
{
    public function __construct(
        public readonly string|int $accountId,
        public readonly string $accountName,
        public readonly string $accountType,
        public readonly string $amount
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'account_id' => $this->accountId,
            'account_name' => $this->accountName,
            'account_type' => $this->accountType,
            'amount' => $this->amount,
        ];
    }
}
