<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Events\RegisteredCompanyCreated;
use App\Listeners\SendVerificationEmail;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Laravel\Sanctum\Sanctum::usePersonalAccessTokenModel(\App\Models\Master\PersonalAccessToken::class);

        Event::listen(
            RegisteredCompanyCreated::class,
            SendVerificationEmail::class
        );

        // Fail fast if SMTP mailer is configured but required env vars are missing.
        // This prevents silent fallback to log driver in production.
        if (config('mail.default') === 'smtp') {
            $required = [
                'MAIL_HOST'     => config('mail.mailers.smtp.host'),
                'MAIL_USERNAME' => config('mail.mailers.smtp.username'),
                'MAIL_PASSWORD' => config('mail.mailers.smtp.password'),
                'MAIL_FROM_ADDRESS' => config('mail.from.address'),
            ];

            foreach ($required as $key => $value) {
                if (empty($value)) {
                    throw new \RuntimeException(
                        "Mail misconfiguration: {$key} is required when MAIL_MAILER=smtp. "
                        . 'Set it in your .env file and run: php artisan optimize:clear'
                    );
                }
            }
        }
    }
}
