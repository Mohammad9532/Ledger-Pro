<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Services\BalanceService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    protected BalanceService $balanceService;

    public function __construct(BalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    public function index(): JsonResponse
    {
        $data = $this->balanceService->getDashboardData();
        $monthlyBreakdown = $this->balanceService->getMonthlyBreakdown(now()->year);

        return response()->json([
            'balances' => $data['balances'],
            'today' => $data['today'],
            'monthly' => $data['monthly'],
            'monthly_breakdown' => $monthlyBreakdown,
        ]);
    }
}
