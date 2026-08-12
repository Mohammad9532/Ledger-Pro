<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class BalanceSheetRow implements JsonSerializable
{
    public function __construct(
        public readonly string|int $accountId,
        public readonly string $accountName,
        public readonly string $accountType,
        public readonly string $balance
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->accountId,
            'name' => $this->accountName,
            'type' => $this->accountType,
            'balance' => $this->balance,
        ];
    }
}
