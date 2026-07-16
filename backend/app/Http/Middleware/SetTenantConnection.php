<?php

namespace App\Http\Middleware;

use App\Models\Master\User;
use App\Services\Tenant\TenantSwitcher;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetTenantConnection
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            $company = $user->company;
            app(TenantSwitcher::class)->switch($company->database_name);
        }

        return $next($request);
    }
}
