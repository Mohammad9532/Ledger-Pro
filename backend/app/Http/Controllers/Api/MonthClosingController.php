<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonthClosing;
use App\Models\AuditLog;
use App\Services\BalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MonthClosingController extends Controller
{
    protected BalanceService $balanceService;

    public function __construct(BalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Get all month closings and available months for the last 24 months.
     */
    public function index(): JsonResponse
    {
        $months = [];
        $now = now();

        // Generate last 24 months
        for ($i = 0; $i < 24; $i++) {
            $date = $now->copy()->subMonths($i);
            $year = $date->year;
            $month = $date->month;

            $closing = MonthClosing::where('year', $year)->where('month', $month)->first();

            $months[] = [
                'year' => $year,
                'month' => $month,
                'month_name' => $date->format('F'),
                'label' => $date->format('F Y'),
                'status' => $closing ? $closing->status : 'open',
                'closed_at' => $closing?->closed_at,
                'closed_by' => $closing?->closedByUser?->name,
                'notes' => $closing?->notes,
                'is_current' => ($year === $now->year && $month === $now->month),
            ];
        }

        return response()->json($months);
    }

    /**
     * Close a month — prevents any transactions in that month from being created, edited, or deleted.
     */
    public function close(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'notes' => 'nullable|string',
        ]);

        $year = $validated['year'];
        $month = $validated['month'];

        // Don't allow closing current or future months
        $targetDate = \Carbon\Carbon::create($year, $month, 1)->endOfMonth();
        if ($targetDate->isFuture() || ($targetDate->isToday())) {
            return response()->json(['error' => 'Cannot close the current or a future month.'], 422);
        }

        $closing = MonthClosing::updateOrCreate(
            ['year' => $year, 'month' => $month],
            [
                'status' => 'closed',
                'notes' => $validated['notes'] ?? null,
                'closed_by' => Auth::id(),
                'closed_at' => now(),
                'reopened_by' => null,
                'reopened_at' => null,
            ]
        );

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => MonthClosing::class,
            'auditable_id' => $closing->id,
            'action' => 'month_closed',
            'new_values' => $closing->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => date('F Y', mktime(0, 0, 0, $month, 1, $year)) . ' has been closed.',
            'closing' => $closing,
        ]);
    }

    /**
     * Reopen a previously closed month.
     */
    public function reopen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $closing = MonthClosing::where('year', $validated['year'])
            ->where('month', $validated['month'])
            ->where('status', 'closed')
            ->first();

        if (!$closing) {
            return response()->json(['error' => 'This month is not closed.'], 422);
        }

        $closing->update([
            'status' => 'open',
            'reopened_by' => Auth::id(),
            'reopened_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => MonthClosing::class,
            'auditable_id' => $closing->id,
            'action' => 'month_reopened',
            'new_values' => $closing->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => date('F Y', mktime(0, 0, 0, $validated['month'], 1, $validated['year'])) . ' has been reopened.',
            'closing' => $closing->fresh(),
        ]);
    }

    /**
     * Check if a specific date is locked.
     */
    public function checkDate(Request $request): JsonResponse
    {
        $date = $request->get('date');
        if (!$date) {
            return response()->json(['locked' => false]);
        }

        return response()->json([
            'locked' => MonthClosing::isDateLocked($date),
            'date' => $date,
        ]);
    }
}
