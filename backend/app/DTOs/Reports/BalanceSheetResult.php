<?php

namespace App\DTOs\Reports;

use JsonSerializable;

class BalanceSheetResult implements JsonSerializable
{
    /**
     * @param BalanceSheetRow[] $currentAssets
     * @param BalanceSheetRow[] $nonCurrentAssets
     * @param BalanceSheetRow[] $currentLiabilities
     * @param BalanceSheetRow[] $nonCurrentLiabilities
     * @param BalanceSheetRow[] $equity
     */
    public function __construct(
        public readonly array $currentAssets,
        public readonly array $nonCurrentAssets,
        public readonly array $currentLiabilities,
        public readonly array $nonCurrentLiabilities,
        public readonly array $equity,
        public readonly string $totalCurrentAssets,
        public readonly string $totalNonCurrentAssets,
        public readonly string $totalCurrentLiabilities,
        public readonly string $totalNonCurrentLiabilities,
        public readonly string $totalAssets,
        public readonly string $totalLiabilities,
        public readonly string $totalEquity,
        public readonly string $totalLiabilitiesAndEquity,
        public readonly bool $isBalanced,
        public readonly string $difference,
        public readonly string $asOfDate,
        public readonly string $generatedAt,
        public readonly string $currency,
        public readonly string $tenant
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'current_assets' => array_map(fn($r) => $r->jsonSerialize(), $this->currentAssets),
            'non_current_assets' => array_map(fn($r) => $r->jsonSerialize(), $this->nonCurrentAssets),
            'current_liabilities' => array_map(fn($r) => $r->jsonSerialize(), $this->currentLiabilities),
            'non_current_liabilities' => array_map(fn($r) => $r->jsonSerialize(), $this->nonCurrentLiabilities),
            'equity' => array_map(fn($r) => $r->jsonSerialize(), $this->equity),
            
            'total_current_assets' => $this->totalCurrentAssets,
            'total_non_current_assets' => $this->totalNonCurrentAssets,
            'total_current_liabilities' => $this->totalCurrentLiabilities,
            'total_non_current_liabilities' => $this->totalNonCurrentLiabilities,
            
            'total_assets' => $this->totalAssets,
            'total_liabilities' => $this->totalLiabilities,
            'total_equity' => $this->totalEquity,
            'total_liabilities_and_equity' => $this->totalLiabilitiesAndEquity,
            
            'is_balanced' => $this->isBalanced,
            'difference' => $this->difference,
            
            'date' => $this->asOfDate, // For backward compatibility if needed
            'as_of' => $this->asOfDate,
            'generated_at' => $this->generatedAt,
            'currency' => $this->currency,
            'tenant' => $this->tenant,
        ];
    }
}
