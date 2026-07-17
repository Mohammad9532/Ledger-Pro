<?php

namespace App\Exceptions\Verification;

use Exception;

class VerificationExpiredException extends Exception
{
    public function __construct(string $message = "This verification code has expired.")
    {
        parent::__construct($message, 400);
    }
}
