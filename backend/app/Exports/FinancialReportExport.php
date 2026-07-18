<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Illuminate\Support\Collection;

class FinancialReportExport implements FromCollection, WithHeadings, WithStyles, ShouldAutoSize, WithColumnFormatting, WithTitle
{
    protected array $data;
    protected string $type;
    protected string $title;
    protected array $headings;
    protected array $columnFormats;

    public function __construct(string $type, string $title, array $data)
    {
        $this->type = $type;
        $this->title = $title;
        $this->data = $data;
        $this->setupConfig();
    }

    protected function setupConfig()
    {
        switch ($this->type) {
            case 'balance-sheet':
                $this->headings = ['Category', 'Type', 'Balance'];
                $this->columnFormats = ['C' => NumberFormat::FORMAT_NUMBER_00];
                break;
            case 'profit-loss':
                $this->headings = ['Category', 'Amount'];
                $this->columnFormats = ['B' => NumberFormat::FORMAT_NUMBER_00];
                break;
            case 'cash-flow':
                $this->headings = ['Flow Type', 'Amount'];
                $this->columnFormats = ['B' => NumberFormat::FORMAT_NUMBER_00];
                break;
            case 'receivable':
            case 'payable':
                $this->headings = ['Name', 'Balance'];
                $this->columnFormats = ['B' => NumberFormat::FORMAT_NUMBER_00];
                break;
            case 'expense-summary':
            case 'income-summary':
                $this->headings = ['Category', 'Total'];
                $this->columnFormats = ['B' => NumberFormat::FORMAT_NUMBER_00];
                break;
            case 'credit-card-summary':
                $this->headings = ['Card Name', 'Balance', 'Outstanding'];
                $this->columnFormats = ['B' => NumberFormat::FORMAT_NUMBER_00, 'C' => NumberFormat::FORMAT_NUMBER_00];
                break;
            default:
                $this->headings = ['Item', 'Value'];
                $this->columnFormats = [];
                break;
        }
    }

    public function collection()
    {
        $rows = [];

        switch ($this->type) {
            case 'balance-sheet':
                $rows[] = ['Assets', '', ''];
                foreach ($this->data['assets'] as $item) {
                    $rows[] = [$item['name'], $item['type'], (float) $item['balance']];
                }
                $rows[] = ['Total Assets', '', (float) $this->data['total_assets']];
                
                $rows[] = ['', '', '']; // empty row
                $rows[] = ['Liabilities', '', ''];
                foreach ($this->data['liabilities'] as $item) {
                    $rows[] = [$item['name'], $item['type'], abs((float) $item['balance'])];
                }
                $rows[] = ['Total Liabilities', '', abs((float) $this->data['total_liabilities'])];

                $rows[] = ['', '', ''];
                $rows[] = ['Equity', '', ''];
                foreach ($this->data['equity'] as $item) {
                    $rows[] = [$item['name'], $item['type'], abs((float) $item['balance'])];
                }
                $rows[] = ['Total Equity', '', abs((float) $this->data['total_equity'])];
                break;

            case 'profit-loss':
                $rows[] = ['Income', ''];
                foreach ($this->data['income'] as $item) {
                    $rows[] = [$item['name'], (float) $item['amount']];
                }
                $rows[] = ['Total Income', (float) $this->data['total_income']];
                
                $rows[] = ['', ''];
                $rows[] = ['Expenses', ''];
                foreach ($this->data['expenses'] as $item) {
                    $rows[] = [$item['name'], (float) $item['amount']];
                }
                $rows[] = ['Total Expenses', (float) $this->data['total_expense']];

                $rows[] = ['', ''];
                $rows[] = ['Net Profit', (float) $this->data['net_profit']];
                break;

            case 'cash-flow':
                $rows[] = ['Inflows', (float) $this->data['inflows']];
                $rows[] = ['Outflows', (float) $this->data['outflows']];
                $rows[] = ['Net Flow', (float) $this->data['net_flow']];
                break;

            case 'receivable':
            case 'payable':
                foreach ($this->data['items'] as $item) {
                    $rows[] = [$item['name'], abs((float) $item['balance'])];
                }
                $rows[] = ['Total', abs((float) $this->data['total'])];
                break;

            case 'expense-summary':
            case 'income-summary':
                foreach ($this->data['categories'] ?? $this->data['items'] as $item) {
                    $rows[] = [$item['category_name'] ?? $item['name'] ?? 'Uncategorized', (float) ($item['total'] ?? $item['amount'] ?? 0)];
                }
                $rows[] = ['Total', (float) ($this->data['grand_total'] ?? $this->data['total'] ?? 0)];
                break;

            case 'credit-card-summary':
                foreach ($this->data as $card) {
                    $rows[] = [$card['name'], (float) $card['balance'], (float) $card['outstanding']];
                }
                break;
        }

        return collect($rows);
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1    => ['font' => ['bold' => true]],
        ];
    }

    public function columnFormats(): array
    {
        return $this->columnFormats;
    }

    public function title(): string
    {
        return $this->title;
    }
}
