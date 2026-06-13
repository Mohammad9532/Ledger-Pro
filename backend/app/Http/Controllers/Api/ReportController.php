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
}
