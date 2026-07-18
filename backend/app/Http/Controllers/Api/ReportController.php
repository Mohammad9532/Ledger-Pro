<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $date = $request->get('date');
        return response()->json($this->reportService->balanceSheet($date));
    }

    public function profitAndLoss(Request $request): JsonResponse
    {
        $request->validate(['start_date' => 'required|date', 'end_date' => 'required|date']);
        return response()->json($this->reportService->profitAndLoss($request->start_date, $request->end_date));
    }

    public function cashFlow(Request $request): JsonResponse
    {
        $request->validate(['start_date' => 'required|date', 'end_date' => 'required|date']);
        return response()->json($this->reportService->cashFlow($request->start_date, $request->end_date));
    }

    public function receivable(): JsonResponse
    {
        return response()->json($this->reportService->receivableReport());
    }

    public function payable(): JsonResponse
    {
        return response()->json($this->reportService->payableReport());
    }

    public function expenseSummary(Request $request): JsonResponse
    {
        $request->validate(['start_date' => 'required|date', 'end_date' => 'required|date']);
        $includeBusiness = filter_var($request->query('include_business', 'false'), FILTER_VALIDATE_BOOLEAN);
        return response()->json($this->reportService->expenseSummary($request->start_date, $request->end_date, $includeBusiness));
    }

    public function incomeSummary(Request $request): JsonResponse
    {
        $request->validate(['start_date' => 'required|date', 'end_date' => 'required|date']);
        $includeBusiness = filter_var($request->query('include_business', 'false'), FILTER_VALIDATE_BOOLEAN);
        return response()->json($this->reportService->incomeSummary($request->start_date, $request->end_date, $includeBusiness));
    }

    public function creditCardSummary(): JsonResponse
    {
        return response()->json($this->reportService->creditCardSummary());
    }

    public function export(Request $request, string $type)
    {
        $validTypes = [
            'balance-sheet', 'profit-loss', 'cash-flow', 
            'receivable', 'payable', 'expense-summary', 
            'income-summary', 'credit-card-summary',
            'account-ledger'
        ];
        
        $validFormats = ['pdf', 'xlsx', 'csv'];

        if (!in_array($type, $validTypes)) {
            return response()->json(['message' => 'Invalid report type'], 400);
        }

        $format = $request->query('format', 'pdf');
        if (!in_array($format, $validFormats)) {
            return response()->json(['message' => 'Invalid export format'], 400);
        }

        if (in_array($type, ['profit-loss', 'cash-flow', 'expense-summary', 'income-summary'])) {
            $request->validate(['start_date' => 'required|date', 'end_date' => 'required|date']);
        }

        if ($type === 'account-ledger') {
            $request->validate(['account_id' => 'required|integer']);
        }

        /** @var \App\Services\ReportExportService $exportService */
        $exportService = app(\App\Services\ReportExportService::class);
        
        return $exportService->export($type, $format, $request->all());
    }
}
