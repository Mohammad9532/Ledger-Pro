<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\VerificationController;
use App\Http\Controllers\Api\Auth\PasswordController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\IncomeCategoryController;
use App\Http\Controllers\Api\BusinessItemController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ReconciliationController;
use App\Http\Controllers\Api\MonthClosingController;
use App\Http\Controllers\Api\CompanyProfileController;

// Public routes
Route::post('/register', [RegisterController::class, 'store']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-email', [VerificationController::class, 'verify']);
Route::post('/resend-verification', [VerificationController::class, 'resend']);

// Password Reset
Route::post('/password/forgot', [PasswordController::class, 'forgot']);
Route::post('/password/verify-otp', [PasswordController::class, 'verifyOtp']);
Route::post('/password/reset', [PasswordController::class, 'reset']);

// Protected routes
Route::middleware([
    'auth:sanctum',
    \App\Http\Middleware\SetTenantConnection::class,
])->group(function () {
    // Audits & Backup
    // Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // System & Backups
    Route::prefix('system')->group(function () {
        Route::get('/status', [\App\Http\Controllers\Api\SystemController::class, 'status']);
        Route::get('/health', [\App\Http\Controllers\Api\SystemController::class, 'health']);
        Route::get('/readiness', [\App\Http\Controllers\Api\SystemController::class, 'readiness']);
        Route::get('/backups', [\App\Http\Controllers\Api\SystemController::class, 'getBackups']);
        Route::post('/backups', [\App\Http\Controllers\Api\SystemController::class, 'createBackup']);
        Route::get('/backups/{filename}/download', [\App\Http\Controllers\Api\SystemController::class, 'downloadBackup']);
        Route::post('/backups/{filename}/restore', [\App\Http\Controllers\Api\SystemController::class, 'restoreBackup']);
    });

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // User Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);
    Route::post('/profile/email/request', [ProfileController::class, 'requestEmailChange']);
    Route::post('/profile/email/verify', [ProfileController::class, 'verifyEmailChange']);

    // Company Profile (Bypasses Onboarding Check)
    Route::get('/company/profile', [CompanyProfileController::class, 'show']);
    Route::put('/company/profile', [CompanyProfileController::class, 'update']);

    // Fully Protected Routes (Requires Onboarding)
    Route::middleware([\App\Http\Middleware\EnsureOnboardingCompleted::class])->group(function () {
        
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

    // Accounts
    Route::apiResource('accounts', AccountController::class);
    Route::get('/accounts/{id}/statement', [AccountController::class, 'statement']);

    // Contacts (People)
    Route::apiResource('contacts', ContactController::class);
    Route::get('/contacts/{id}/ledger', [ContactController::class, 'ledger']);
    Route::get('/contacts/{id}/summary', [ContactController::class, 'summary']);

    // Transactions
    Route::apiResource('transactions', TransactionController::class);
    Route::post('/transactions/{id}/restore', [TransactionController::class, 'restore']);

    // Expense Categories
    Route::apiResource('expense-categories', ExpenseCategoryController::class);

    // Income Categories
    Route::apiResource('income-categories', IncomeCategoryController::class);

    // Business Items
    Route::apiResource('business-items', BusinessItemController::class)->only(['index', 'store', 'show']);
    Route::post('/business-items/{id}/sell', [BusinessItemController::class, 'recordSale']);
    Route::get('/business-profit', [BusinessItemController::class, 'profitReport']);

    // Reconciliation
    Route::get('/reconciliation/accounts', [ReconciliationController::class, 'accounts']);
    Route::post('/reconciliation/reconcile', [ReconciliationController::class, 'reconcile']);
    Route::post('/reconciliation/{id}/adjust', [ReconciliationController::class, 'adjust']);
    Route::get('/reconciliation/history', [ReconciliationController::class, 'history']);

    // Month Closing
    Route::get('/month-closings', [MonthClosingController::class, 'index']);
    Route::post('/month-closings/close', [MonthClosingController::class, 'close']);
    Route::post('/month-closings/reopen', [MonthClosingController::class, 'reopen']);
    Route::get('/month-closings/check-date', [MonthClosingController::class, 'checkDate']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/balance-sheet', [ReportController::class, 'balanceSheet']);
        Route::get('/profit-loss', [ReportController::class, 'profitAndLoss']);
        Route::get('/cash-flow', [ReportController::class, 'cashFlow']);
        Route::get('/receivable', [ReportController::class, 'receivable']);
        Route::get('/payable', [ReportController::class, 'payable']);
        Route::get('/expense-summary', [ReportController::class, 'expenseSummary']);
        Route::get('/income-summary', [ReportController::class, 'incomeSummary']);
        Route::get('/credit-card-summary', [ReportController::class, 'creditCardSummary']);
        Route::get('/{type}/export', [ReportController::class, 'export']);
    });

        // Search
        Route::get('/search', [SearchController::class, 'search']);
    });
});
