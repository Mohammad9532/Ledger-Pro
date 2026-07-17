<?php

return [
    'otp' => [
        'length' => 6,
        'expiry_minutes' => 10,
        'max_attempts' => 5,
        'resend_after_seconds' => 60,
        'max_daily_resends' => 10,
    ],
];
