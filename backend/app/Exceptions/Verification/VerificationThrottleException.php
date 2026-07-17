<?php

namespace App\Exceptions\Verification;

use Exception;

class VerificationThrottleException extends Exception
{
    public function __construct(string $message = "Please wait before requesting another code.")
    {
        parent::__construct($message, 429);
    }
}
