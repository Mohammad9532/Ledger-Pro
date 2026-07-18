<?php

namespace App\Services\Auth;

use App\Models\Master\User;
use App\Models\Master\VerificationCode;
use App\Enums\VerificationPurpose;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\VerifyEmailOtpMail;
use App\Mail\PasswordResetOtpMail;
use App\Mail\ChangeEmailOtpMail;
use App\Exceptions\Verification\VerificationThrottleException;
use App\Exceptions\Verification\VerificationExpiredException;
use App\Exceptions\Verification\VerificationAttemptsExceededException;
use App\Exceptions\Verification\VerificationCodeInvalidException;

class OtpService
{
    public function generateCode(): string
    {
        $length = config('verification.otp.length', 6);
        return str_pad((string) random_int(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    public function hashOtp(string $plainCode): string
    {
        return hash_hmac('sha256', $plainCode, config('app.key'));
    }

    public function send(User $user, VerificationPurpose $purpose, ?string $targetEmail = null, ?array $metadata = null): void
    {
        $code = VerificationCode::where('user_id', $user->id)->where('purpose', $purpose)->first();

        // Throttle check if we already sent one recently
        if ($code && $code->last_sent_at) {
            $resendAfter = config('verification.otp.resend_after_seconds', 60);
            if (now()->lessThan($code->last_sent_at->addSeconds($resendAfter))) {
                throw new VerificationThrottleException();
            }
        }

        // Invalidate old code by deleting it
        if ($code) {
            $code->delete();
        }

        $plainCode = $this->generateCode();
        $expiryMinutes = config('verification.otp.expiry_minutes', 10);
        
        VerificationCode::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'code_hash' => $this->hashOtp($plainCode),
            'expires_at' => now()->addMinutes($expiryMinutes),
            'attempts' => 0,
            'last_sent_at' => now(),
            'verified_at' => null,
            'metadata' => $metadata,
        ]);

        $sendTo = $targetEmail ?? $user->email;

        $mailable = match ($purpose) {
            VerificationPurpose::EMAIL_VERIFICATION => new VerifyEmailOtpMail($plainCode, $sendTo),
            VerificationPurpose::PASSWORD_RESET => new PasswordResetOtpMail($plainCode, $sendTo),
            VerificationPurpose::CHANGE_EMAIL => new ChangeEmailOtpMail($plainCode, $sendTo),
            default => throw new \Exception("Unsupported verification purpose"),
        };

        Mail::to($sendTo)->queue($mailable);
    }

    public function verify(User $user, VerificationPurpose $purpose, string $plainCode): void
    {
        $code = VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->first();

        if (!$code) {
            throw new VerificationCodeInvalidException();
        }

        if ($code->verified_at) {
            // Already verified
            return;
        }

        if (now()->isAfter($code->expires_at)) {
            throw new VerificationExpiredException();
        }

        $maxAttempts = config('verification.otp.max_attempts', 5);
        if ($code->attempts >= $maxAttempts) {
            throw new VerificationAttemptsExceededException();
        }

        if (!hash_equals($code->code_hash, $this->hashOtp($plainCode))) {
            $code->increment('attempts');
            
            if ($code->attempts >= $maxAttempts) {
                throw new VerificationAttemptsExceededException();
            }
            
            throw new VerificationCodeInvalidException();
        }

        $code->update(['verified_at' => now()]);
    }

    public function isVerified(User $user, VerificationPurpose $purpose): bool
    {
        $code = VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->first();

        if (!$code || !$code->verified_at) {
            return false;
        }

        // Optional: Check if verified OTP has expired
        if (now()->isAfter($code->expires_at)) {
            return false;
        }

        return true;
    }
    
    public function getMetadata(User $user, VerificationPurpose $purpose): ?array
    {
        $code = VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->first();
            
        return $code ? $code->metadata : null;
    }

    public function consume(User $user, VerificationPurpose $purpose): void
    {
        VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->delete();
    }
}
