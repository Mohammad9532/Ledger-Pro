<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use App\Mail\VerifyEmailOtpMail;

class MailTest extends Command
{
    protected $signature = 'mail:test {email : The recipient email address}';

    protected $description = 'Send a test OTP email through the configured mailer (Brevo)';

    public function handle(): int
    {
        $email = $this->argument('email');

        $this->info("Sending test email to: {$email}");
        $this->line('  Mailer : ' . config('mail.default'));
        $this->line('  Host   : ' . config('mail.mailers.smtp.host'));
        $this->line('  From   : ' . config('mail.from.address'));
        $this->newLine();

        try {
            Mail::to($email)->queue(new VerifyEmailOtpMail(
                otp: '123456',
                recipientEmail: $email,
            ));

            $this->info('✓ Test email queued successfully.');
            $this->line('  Run <comment>php artisan queue:work</comment> to dispatch it.');

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('✗ Failed to queue test email:');
            $this->error('  ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
