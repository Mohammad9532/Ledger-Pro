<?php

namespace App\Exceptions\Verification;

use Exception;

class VerificationAttemptsExceededException extends Exception
{
    public function __construct(string $message = "Too many incorrect attempts. A new verification code has been sent.")
    {
        parent::__construct($message, 429);
    }
}
