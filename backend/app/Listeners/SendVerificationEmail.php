<?php

namespace App\Listeners;

use App\Events\RegisteredCompanyCreated;
use App\Services\Auth\OtpService;
use App\Enums\VerificationPurpose;

class SendVerificationEmail
{
    public function __construct(
        private OtpService $otpService
    ) {}

    public function handle(RegisteredCompanyCreated $event): void
    {
        $user = $event->result->owner;
        $purpose = VerificationPurpose::EMAIL_VERIFICATION;

        $this->otpService->send($user, $purpose);
    }
}
