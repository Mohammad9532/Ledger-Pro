<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\Master\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $throttleKey = 'login-attempts:' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds."
            ], 429);
        }

        if (!Auth::attempt($validated)) {
            RateLimiter::hit($throttleKey, 600);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        $user = User::where('email', $validated['email'])->firstOrFail();

        if (is_null($user->email_verified_at)) {
            Auth::logout(); // Ensure we don't leave an active session if they were somehow authenticated via cookies
            return response()->json([
                'message' => 'Please verify your email.'
            ], 403);
        }

        // Revoke old tokens
        $user->tokens()->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        $userArray = $user->toArray();
        if ($user->company) {
            app(\App\Services\Tenant\TenantSwitcher::class)->switch($user->company->database_name);
            $profile = \App\Models\Tenant\CompanyProfile::first();
            if ($profile) {
                $userArray['currency_code'] = $profile->currency_code;
            }
        }

        return response()->json([
            'user' => $userArray,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        $userArray = $user->toArray();
        
        if ($user->company) {
            app(\App\Services\Tenant\TenantSwitcher::class)->switch($user->company->database_name);
            $profile = \App\Models\Tenant\CompanyProfile::first();
            if ($profile) {
                $userArray['currency_code'] = $profile->currency_code;
            }
        }

        return response()->json($userArray);
    }
}
