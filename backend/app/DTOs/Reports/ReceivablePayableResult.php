<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class ReceivablePayableResult implements JsonSerializable
{
    /**
     * @param ReceivablePayableRow[] $items
     */
    public function __construct(
        public readonly array $items,
        public readonly string $total,
        public readonly string $asOfDate,
        public readonly string $generatedAt,
        public readonly string $currency,
        public readonly string $tenant,
        public readonly string $reportType
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'items' => array_map(fn($r) => $r->jsonSerialize(), $this->items),
            'total' => $this->total,
            'as_of' => $this->asOfDate,
            'generated_at' => $this->generatedAt,
            'currency' => $this->currency,
            'tenant' => $this->tenant,
            'report_type' => $this->reportType,
        ];
    }
}
