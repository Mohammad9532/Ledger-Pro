<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Services\Auth\OtpService;
use App\Enums\VerificationPurpose;
use Exception;

class ProfileController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    public function show(Request $request)
    {
        return response()->json([
            'user' => $request->user()
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $user->update($request->only('name', 'phone'));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The provided current password does not match our records.'
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'message' => 'Password changed successfully.'
        ]);
    }

    public function requestEmailChange(Request $request)
    {
        $request->validate([
            'new_email' => 'required|email|unique:users,email'
        ]);

        $user = $request->user();
        $newEmail = $request->new_email;

        try {
            $this->otpService->send(
                $user, 
                VerificationPurpose::CHANGE_EMAIL, 
                $newEmail, 
                ['new_email' => $newEmail]
            );

            return response()->json([
                'message' => 'A verification code has been sent to your new email address.'
            ]);
        } catch (Exception $e) {
            $status = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    public function verifyEmailChange(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        $user = $request->user();

        try {
            $this->otpService->verify($user, VerificationPurpose::CHANGE_EMAIL, $request->code);
            
            $metadata = $this->otpService->getMetadata($user, VerificationPurpose::CHANGE_EMAIL);

            if (empty($metadata['new_email'])) {
                return response()->json(['message' => 'Verification state invalid.'], 400);
            }

            $user->update([
                'email' => $metadata['new_email']
            ]);

            $this->otpService->consume($user, VerificationPurpose::CHANGE_EMAIL);

            return response()->json([
                'message' => 'Email address changed successfully.',
                'user' => $user
            ]);

        } catch (Exception $e) {
            $status = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}
