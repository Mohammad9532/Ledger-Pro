<?php

namespace App\Exceptions\Verification;

use Exception;

class VerificationCodeInvalidException extends Exception
{
    public function __construct(string $message = "Invalid verification code.")
    {
        parent::__construct($message, 400);
    }
}
