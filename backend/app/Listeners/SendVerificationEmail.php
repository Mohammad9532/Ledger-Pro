<?php

namespace App\Listeners;

use App\Events\RegisteredCompanyCreated;
use App\Services\Registration\EmailVerificationService;
use App\Enums\VerificationPurpose;

class SendVerificationEmail
{
    public function __construct(
        private EmailVerificationService $verificationService
    ) {}

    public function handle(RegisteredCompanyCreated $event): void
    {
        $user = $event->result->owner;
        $purpose = VerificationPurpose::EMAIL_VERIFICATION;

        $plainCode = $this->verificationService->generateCode();
        $this->verificationService->storeCode($user, $purpose, $plainCode);
        $this->verificationService->sendEmail($user, $plainCode);
    }
}
