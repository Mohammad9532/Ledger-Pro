<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\VerificationPurpose;
use App\Http\Controllers\Controller;
use App\Models\Master\User;
use App\Services\Auth\OtpService;
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
            'device_name' => 'sometimes|nullable|string|max:60',
        ]);

        $throttleKey = 'login-attempts:' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds."
            ], 429);
        }

        // Only the credentials go to attempt(); any other validated field would become a column lookup.
        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']])) {
            RateLimiter::hit($throttleKey, 600);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        $user = User::where('email', $validated['email'])->firstOrFail();

        if (is_null($user->email_verified_at)) {
            Auth::logout(); // Ensure we don't leave an active session if they were somehow authenticated via cookies

            // The password was correct, so this is the account owner: send a fresh code so they are
            // never stuck. Inside the resend window the previous code is still valid, so a throttle is fine.
            try {
                app(OtpService::class)->send($user, VerificationPurpose::EMAIL_VERIFICATION);
            } catch (\Throwable $e) {
                // Throttled or mail hiccup: the client still routes to the verify screen, which can resend.
            }

            return response()->json([
                'message' => 'Please verify your email. We have sent a verification code to ' . $user->email . '.',
                'code' => 'EMAIL_NOT_VERIFIED',
                'email' => $user->email,
            ], 403);
        }

        // Revoke only this device's previous token. Revoking every token here used to
        // sign the mobile app out whenever the same user signed in on the web.
        $deviceName = $request->input('device_name') ?: 'web';
        $user->tokens()->where('name', $deviceName)->delete();

        $token = $user->createToken($deviceName)->plainTextToken;

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
