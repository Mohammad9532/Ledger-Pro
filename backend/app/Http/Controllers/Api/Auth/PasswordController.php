<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Master\User;
use App\Services\Auth\OtpService;
use App\Enums\VerificationPurpose;
use Exception;

class PasswordController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    public function forgot(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'No account found with that email address.'
            ], 404);
        }

        try {
            $this->otpService->send($user, VerificationPurpose::PASSWORD_RESET);
        } catch (Exception $e) {
            // If it's a throttle exception, just return a generic success to prevent email enumeration,
            // or pass the message. For best security, generic message:
        }

        return response()->json([
            'message' => 'If an account with that email exists, a password reset code has been sent.'
        ], 200);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired code.'], 400);
        }

        try {
            $this->otpService->verify($user, VerificationPurpose::PASSWORD_RESET, $request->code);
            
            return response()->json([
                'message' => 'Code verified. You can now reset your password.'
            ], 200);
        } catch (Exception $e) {
            $status = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    public function reset(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Invalid request.'], 400);
        }

        // Check if there is a verified OTP
        if (!$this->otpService->isVerified($user, VerificationPurpose::PASSWORD_RESET)) {
            return response()->json([
                'message' => 'You must verify the reset code before changing your password.'
            ], 403);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        $this->otpService->consume($user, VerificationPurpose::PASSWORD_RESET);

        return response()->json([
            'message' => 'Password reset successfully.'
        ], 200);
    }
}
