<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Models\Master\User;
use App\Services\Registration\EmailVerificationService;
use App\Enums\VerificationPurpose;
use Exception;

class VerificationController extends Controller
{
    public function __construct(
        private EmailVerificationService $verificationService
    ) {}

    public function verify(VerifyOtpRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();

        try {
            $this->verificationService->verifyCode(
                $user,
                VerificationPurpose::EMAIL_VERIFICATION,
                $request->code
            );

            return response()->json([
                'message' => 'Email verified successfully'
            ], 200);
            
        } catch (Exception $e) {
            // Because domain exceptions extend Exception and have their own HTTP code (400, 429),
            // we can retrieve it dynamically or fallback to 400.
            $status = $e->getCode() ?: 400;
            return response()->json([
                'message' => $e->getMessage()
            ], $status);
        }
    }

    public function resend(ResendOtpRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();

        // Prevent resend if already verified
        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'This email is already verified.'
            ], 422);
        }

        try {
            $this->verificationService->resendCode(
                $user,
                VerificationPurpose::EMAIL_VERIFICATION
            );

            return response()->json([
                'message' => 'A new verification code has been sent to your email.'
            ], 200);

        } catch (Exception $e) {
            $status = $e->getCode() ?: 400;
            return response()->json([
                'message' => $e->getMessage()
            ], $status);
        }
    }
}
