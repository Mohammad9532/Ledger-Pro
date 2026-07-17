<?php

namespace App\Events;

use App\DTOs\RegistrationResult;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RegisteredCompanyCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public RegistrationResult $result
    ) {}
}
