<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncomeCategory;
use App\Models\Account;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IncomeCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = IncomeCategory::with('account')->orderBy('name')->get();
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        return DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $userId = Auth::id();

            // Auto-create a ledger account for this category
            $account = Account::create([
                'name'            => $validated['name'],
                'type'            => 'income',
                'opening_balance' => 0,
                'is_active'       => true,
                'is_system'       => true, // Strictly system-managed
                'created_by'      => $userId,
                'updated_by'      => $userId,
            ]);

            $category = IncomeCategory::create([
                'name'       => $validated['name'],
                'account_id' => $account->id,
            ]);

            AuditLog::create([
                'user_id'        => $userId,
                'auditable_type' => IncomeCategory::class,
                'auditable_id'   => $category->id,
                'action'         => 'created',
                'new_values'     => $category->toArray(),
                'ip_address'     => $request->ip(),
                'created_at'     => now(),
            ]);

            return response()->json($category->load('account'), 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $category = IncomeCategory::with('account')->findOrFail($id);
        return response()->json($category);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = IncomeCategory::findOrFail($id);
        $oldValues = $category->toArray();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        return DB::connection('tenant')->transaction(function () use ($category, $validated, $oldValues, $request) {
            $category->update(['name' => $validated['name']]);

            // Sync account name if it exists
            if ($category->account) {
                $category->account->update([
                    'name'       => $validated['name'],
                    'updated_by' => Auth::id(),
                ]);
            }

            AuditLog::create([
                'user_id'        => Auth::id(),
                'auditable_type' => IncomeCategory::class,
                'auditable_id'   => $category->id,
                'action'         => 'updated',
                'old_values'     => $oldValues,
                'new_values'     => $category->toArray(),
                'ip_address'     => $request->ip(),
                'created_at'     => now(),
            ]);

            return response()->json($category->load('account'));
        });
    }

    public function destroy(int $id): JsonResponse
    {
        $category = IncomeCategory::findOrFail($id);

        if ($category->account && $category->account->entries()->exists()) {
            return response()->json([
                'error' => 'Cannot delete income category because its ledger account has transactions.'
            ], 422);
        }

        return DB::connection('tenant')->transaction(function () use ($category) {
            $account = $category->account;

            // 1. Delete the category first
            $category->delete();

            // 2. Then delete the linked account
            if ($account) {
                // Bypass normal account deletion restriction since we're deleting from the parent module
                $account->forceDelete();
            }

            return response()->json(['message' => 'Income category and linked account deleted successfully']);
        });
    }
}
