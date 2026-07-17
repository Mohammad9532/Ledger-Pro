<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingCompleted
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->company && is_null($user->company->onboarding_completed_at)) {
            return response()->json([
                'code' => 'ONBOARDING_REQUIRED',
                'message' => 'Please complete company setup.'
            ], 403);
        }

        return $next($request);
    }
}
