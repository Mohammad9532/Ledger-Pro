<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Verification Code',
        );
    }

    public function content(): Content
    {
        // Use raw content for simplicity right now since we just log it anyway.
        return new Content(
            htmlString: "<h1>Your Verification Code is: {$this->otp}</h1><p>This code will expire in " . config('verification.otp.expiry_minutes', 10) . " minutes.</p>"
        );
    }
}
