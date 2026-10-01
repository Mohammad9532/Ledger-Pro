<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ChangeEmailOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public int $expiryMinutes;

    public function __construct(
        public string $otp,
        public string $recipientEmail,
    ) {
        $this->expiryMinutes = (int) config('verification.otp.expiry_minutes', 10);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirm your new Ledger Pro email',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.change-email-otp',
            text: 'emails.change-email-otp-text',
        );
    }
}
