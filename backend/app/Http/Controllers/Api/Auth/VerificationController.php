<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Models\Master\User;
use App\Services\Auth\OtpService;
use App\Enums\VerificationPurpose;
use App\Events\EmailVerified;
use Exception;

class VerificationController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    public function verify(VerifyOtpRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();

        try {
            $this->otpService->verify(
                $user,
                VerificationPurpose::EMAIL_VERIFICATION,
                $request->code
            );

            // Execute the business action after OTP verification
            $user->update(['email_verified_at' => now()]);
            
            // Clean up the code
            $this->otpService->consume($user, VerificationPurpose::EMAIL_VERIFICATION);

            // Dispatch event
            EmailVerified::dispatch($user);

            return response()->json([
                'message' => 'Email verified successfully'
            ], 200);
            
        } catch (Exception $e) {
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
            // Note: The new OtpService automatically replaces the old code
            // and handles throttling checks.
            $this->otpService->send(
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
