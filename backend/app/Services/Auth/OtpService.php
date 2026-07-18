<?php

namespace App\Services\Registration;

use App\Models\Master\User;
use App\Models\Master\VerificationCode;
use App\Enums\VerificationPurpose;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\VerifyEmailOtpMail;
use App\Exceptions\Verification\VerificationThrottleException;
use App\Exceptions\Verification\VerificationExpiredException;
use App\Exceptions\Verification\VerificationAttemptsExceededException;
use App\Exceptions\Verification\VerificationCodeInvalidException;
use App\Events\EmailVerified;

class EmailVerificationService
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

    public function storeCode(User $user, VerificationPurpose $purpose, string $plainCode): VerificationCode
    {
        $expiryMinutes = config('verification.otp.expiry_minutes', 10);
        
        return VerificationCode::updateOrCreate(
            ['user_id' => $user->id, 'purpose' => $purpose],
            [
                'code_hash' => $this->hashOtp($plainCode),
                'expires_at' => now()->addMinutes($expiryMinutes),
                'attempts' => 0,
                'last_sent_at' => now(),
                'verified_at' => null,
            ]
        );
    }

    public function verifyCode(User $user, VerificationPurpose $purpose, string $plainCode): void
    {
        $code = VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->first();

        if (!$code) {
            throw new VerificationCodeInvalidException();
        }

        if (now()->isAfter($code->expires_at)) {
            throw new VerificationExpiredException();
        }

        $maxAttempts = config('verification.otp.max_attempts', 5);
        if ($code->attempts >= $maxAttempts) {
            $this->resendCode($user, $purpose, true);
            throw new VerificationAttemptsExceededException();
        }

        if (!hash_equals($code->code_hash, $this->hashOtp($plainCode))) {
            $code->increment('attempts');
            
            if ($code->attempts >= $maxAttempts) {
                $this->resendCode($user, $purpose, true);
                throw new VerificationAttemptsExceededException();
            }
            
            throw new VerificationCodeInvalidException();
        }

        DB::connection('master')->transaction(function () use ($code, $user, $purpose) {
            $user->update(['email_verified_at' => now()]);
            $this->deleteCode($user, $purpose);
        });
        
        EmailVerified::dispatch($user);
    }

    public function resendCode(User $user, VerificationPurpose $purpose, bool $force = false): void
    {
        if (!$force) {
            $code = VerificationCode::where('user_id', $user->id)->where('purpose', $purpose)->first();
            if ($code && $code->last_sent_at) {
                $resendAfter = config('verification.otp.resend_after_seconds', 60);
                if (now()->lessThan($code->last_sent_at->addSeconds($resendAfter))) {
                    throw new VerificationThrottleException();
                }
            }
        }

        $plainCode = $this->generateCode();
        $this->storeCode($user, $purpose, $plainCode);
        $this->sendEmail($user, $plainCode);
    }

    public function sendEmail(User $user, string $plainCode): void
    {
        Mail::to($user->email)->queue(new VerifyEmailOtpMail(
            otp: $plainCode,
            recipientEmail: $user->email,
        ));
    }

    public function deleteCode(User $user, VerificationPurpose $purpose): void
    {
        VerificationCode::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->delete();
    }
}
