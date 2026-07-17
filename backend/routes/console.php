<?php

use Illuminate\Support\Facades\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\Master\VerificationCode;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    VerificationCode::where('expires_at', '<', now())->limit(1000)->delete();
})->daily();

Schedule::command('app:backup-db')->daily();
