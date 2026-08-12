<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class CashFlowResult implements JsonSerializable
{
    /**
     * @param CashFlowRow[] $operatingActivities
     * @param CashFlowRow[] $investingActivities
     * @param CashFlowRow[] $financingActivities
     */
    public function __construct(
        public readonly array $operatingActivities,
        public readonly array $investingActivities,
        public readonly array $financingActivities,
        public readonly string $netOperatingCashFlow,
        public readonly string $netInvestingCashFlow,
        public readonly string $netFinancingCashFlow,
        public readonly string $netCashFlow,
        public readonly string $openingBalance,
        public readonly string $closingBalance,
        public readonly string $startDate,
        public readonly string $endDate,
        public readonly string $generatedAt,
        public readonly string $currency,
        public readonly string $tenant
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'operating_activities' => array_map(fn($r) => $r->jsonSerialize(), $this->operatingActivities),
            'investing_activities' => array_map(fn($r) => $r->jsonSerialize(), $this->investingActivities),
            'financing_activities' => array_map(fn($r) => $r->jsonSerialize(), $this->financingActivities),
            'net_operating_cash_flow' => $this->netOperatingCashFlow,
            'net_investing_cash_flow' => $this->netInvestingCashFlow,
            'net_financing_cash_flow' => $this->netFinancingCashFlow,
            'net_cash_flow' => $this->netCashFlow,
            'opening_balance' => $this->openingBalance,
            'closing_balance' => $this->closingBalance,
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
