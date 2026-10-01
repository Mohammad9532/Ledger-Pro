<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\VerificationPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Master\User;
use App\Services\Auth\OtpService;
use App\Services\Registration\RegistrationOrchestrator;
use Exception;

class RegisterController extends Controller
{
    public function __construct(
        private RegistrationOrchestrator $orchestrator,
        private OtpService $otpService
    ) {}

    public function store(RegisterRequest $request)
    {
        // Someone who registered earlier but left before entering the code: don't block them with
        // "email already taken" and don't create a second company. Send a fresh code instead.
        // The existing password is kept on purpose, so a stranger re-registering an unverified
        // address cannot set a password that the real owner would then verify.
        $existing = User::where('email', $request->input('email'))->first();
        if ($existing && is_null($existing->email_verified_at)) {
            try {
                $this->otpService->send($existing, VerificationPurpose::EMAIL_VERIFICATION);
            } catch (Exception $e) {
                // Throttled: the code sent less than a minute ago is still valid.
            }

            return response()->json([
                'message' => 'This email is already registered but not verified yet. We have sent a new verification code. Your password is the one you chose when you first registered.',
                'status' => 'pending_verification',
            ], 200);
        }

        try {
            $result = $this->orchestrator->registerCompany($request->validated());

            return response()->json([
                'message' => 'Verification code sent',
                'status' => 'pending_verification'
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Registration failed.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
