<?php

namespace App\Services;

use App\Exports\FinancialReportExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ReportExportService
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    public function export(string $type, string $format, array $params)
    {
        // Get raw data from the report service
        $data = $this->getReportData($type, $params);
        $title = $this->getReportTitle($type);
        
        // Generate descriptive filename
        $filename = $this->generateFilename($type, $title, $params, $format, $data);

        if ($format === 'pdf') {
            return $this->exportPdf($type, $title, $data, $params, $filename);
        }

        if (in_array($format, ['csv', 'xlsx'])) {
            $exportClass = new FinancialReportExport($type, $title, $data);
            $extension = $format === 'csv' ? \Maatwebsite\Excel\Excel::CSV : \Maatwebsite\Excel\Excel::XLSX;
            return Excel::download($exportClass, $filename, $extension);
        }

        throw new \InvalidArgumentException('Unsupported format');
    }

    protected function getReportData(string $type, array $params): array
    {
        return match ($type) {
            'balance-sheet' => $this->reportService->balanceSheet($params['date'] ?? null),
            'profit-loss' => $this->reportService->profitAndLoss($params['start_date'], $params['end_date']),
            'cash-flow' => $this->reportService->cashFlow($params['start_date'], $params['end_date']),
            'receivable' => $this->reportService->receivableReport(),
            'payable' => $this->reportService->payableReport(),
            'expense-summary' => $this->reportService->expenseSummary($params['start_date'], $params['end_date'], filter_var($params['include_business'] ?? 'false', FILTER_VALIDATE_BOOLEAN)),
            'income-summary' => $this->reportService->incomeSummary($params['start_date'], $params['end_date'], filter_var($params['include_business'] ?? 'false', FILTER_VALIDATE_BOOLEAN)),
            'credit-card-summary' => $this->reportService->creditCardSummary(),
            'account-ledger' => app(\App\Services\BalanceService::class)->getAccountStatement($params['account_id'], $params['start_date'] ?? null, $params['end_date'] ?? null),
            default => throw new \InvalidArgumentException("Invalid report type: $type"),
        };
    }

    protected function getReportTitle(string $type): string
    {
        $titles = [
            'balance-sheet' => 'Balance Sheet',
            'profit-loss' => 'Profit & Loss Statement',
            'cash-flow' => 'Cash Flow Statement',
            'receivable' => 'Receivable Report',
            'payable' => 'Payable Report',
            'expense-summary' => 'Expense Summary',
            'income-summary' => 'Income Summary',
            'credit-card-summary' => 'Credit Card Summary',
            'account-ledger' => 'Ledger Statement',
        ];

        return $titles[$type] ?? Str::headline($type);
    }

    protected function generateFilename(string $type, string $title, array $params, string $format, array $data = []): string
    {
        $base = Str::slug($title);
        
        if ($type === 'account-ledger' && isset($data['account']['name'])) {
            $base = 'Ledger-' . Str::slug($data['account']['name']);
        }
        $dateSuffix = '';

        if (isset($params['start_date']) && isset($params['end_date'])) {
            $dateSuffix = '_' . $params['start_date'] . '_to_' . $params['end_date'];
        } elseif (isset($params['date'])) {
            $dateSuffix = '_' . $params['date'];
        } else {
            $dateSuffix = '_' . now()->format('Y-m-d');
        }

        return "{$base}{$dateSuffix}.{$format}";
    }

    protected function exportPdf(string $type, string $title, array $data, array $params, string $filename)
    {
        $company = auth()->user()->company;
        
        // Fetch Tenant Profile for logo and currency
        $profile = \App\Models\Tenant\CompanyProfile::first();
        $companyName = $profile ? $profile->company_name : ($company ? $company->company_name : 'Ledger-Pro');
        $currencyCode = $profile ? $profile->currency_code : '₹';
        $logoPath = $profile && $profile->logo_path ? storage_path('app/public/' . $profile->logo_path) : null;
        
        $period = '';
        if (isset($params['start_date']) && isset($params['end_date'])) {
            $period = Carbon::parse($params['start_date'])->format('d M Y') . ' – ' . Carbon::parse($params['end_date'])->format('d M Y');
        } elseif (isset($params['date'])) {
            $period = 'As at ' . Carbon::parse($params['date'])->format('d M Y');
        } else {
            $period = 'As at ' . now()->format('d M Y');
        }

        // Generate unique report ID
        $reportIdPrefix = collect(explode('-', $type))->map(fn($w) => strtoupper(substr($w, 0, 1)))->join('');
        $reportId = $reportIdPrefix . '-' . now()->format('Ymd') . '-' . strtoupper(Str::random(4));

        $pdf = Pdf::loadView('reports.' . $type, [
            'data' => $data,
            'title' => $title,
            'companyName' => $companyName,
            'period' => $period,
            'generatedAt' => now()->format('d M Y H:i'),
            'currency' => $currencyCode,
            'logoPath' => $logoPath,
            'reportId' => $reportId,
        ]);

        return $pdf->download($filename);
    }
}
