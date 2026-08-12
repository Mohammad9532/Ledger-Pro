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
        $recentTransactions = $this->balanceService->getRecentTransactions(5);

        return response()->json([
            'summary' => $data['balances'],
            'monthly' => [
                'today' => $data['today'],
                'this_month' => $data['monthly'],
            ],
            'charts' => [
                'monthly_breakdown' => $monthlyBreakdown,
            ],
            'quick_actions' => [
                ['id' => 'add_income', 'label' => 'Add Income', 'icon' => 'arrow-down-circle', 'route' => '/(tabs)/transactions/create?type=income'],
                ['id' => 'add_expense', 'label' => 'Add Expense', 'icon' => 'arrow-up-circle', 'route' => '/(tabs)/transactions/create?type=expense'],
                ['id' => 'transfer', 'label' => 'Transfer', 'icon' => 'refresh-cw', 'route' => '/(tabs)/transactions/create?type=transfer'],
            ],
            'recent_transactions' => $recentTransactions,
            'notifications' => [],
        ]);
    }
}
