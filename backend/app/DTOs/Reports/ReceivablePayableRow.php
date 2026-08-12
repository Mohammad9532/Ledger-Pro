<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class ReceivablePayableRow implements JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?int $contactId,
        public readonly string $balance
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'contact_id' => $this->contactId,
            'balance' => $this->balance,
        ];
    }
}
