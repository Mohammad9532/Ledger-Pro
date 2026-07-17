<?php

namespace App\Enums;

enum VerificationPurpose: string
{
    case EMAIL_VERIFICATION = 'email_verification';
    case PASSWORD_RESET = 'password_reset';
    case CHANGE_EMAIL = 'change_email';
    case TWO_FACTOR = 'two_factor';
}
