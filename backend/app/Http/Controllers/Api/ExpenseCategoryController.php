<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ExpenseCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ExpenseCategory::with('account')->orderBy('name')->get();
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tenant.expense_categories,name',
        ]);

        return DB::connection('tenant')->transaction(function () use ($validated) {
            $account = Account::create([
                'name' => $validated['name'] . ' Expense',
                'type' => 'expense',
                'opening_balance' => 0,
                'is_active' => true,
                'is_system' => true,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
            ]);

            $category = ExpenseCategory::create([
                'name' => $validated['name'],
                'account_id' => $account->id,
            ]);

            return response()->json($category->load('account'), 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(ExpenseCategory::with('account')->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = ExpenseCategory::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tenant.expense_categories,name,' . $id,
        ]);
        $category->update($validated);
        if ($category->account) {
            $category->account->update(['name' => $validated['name'] . ' Expense']);
        }
        return response()->json($category->load('account'));
    }

    public function destroy(int $id): JsonResponse
    {
        $category = ExpenseCategory::with('account')->findOrFail($id);

        if ($category->account && $category->account->entries()->exists()) {
            return response()->json([
                'error' => 'Cannot delete expense category because its ledger account has transactions.'
            ], 422);
        }

        return DB::connection('tenant')->transaction(function () use ($category) {
            $account = $category->account;
            $category->delete();
            if ($account) {
                $account->forceDelete();
            }
            return response()->json(['message' => 'Category and linked account deleted']);
        });
    }
}
