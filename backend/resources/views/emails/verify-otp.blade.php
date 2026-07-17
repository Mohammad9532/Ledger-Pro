<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email address</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; background-color: #f4f6f9; padding: 40px 16px; box-sizing: border-box; }
    .card { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
    .header-brand { display: inline-flex; align-items: center; gap: 10px; }
    .header-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .header-name { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .body { padding: 40px 40px 32px; }
    .greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
    .intro { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 32px; }
    .otp-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin: 0 0 12px; }
    .otp-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
    .otp-code { font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #2563eb; font-variant-numeric: tabular-nums; font-family: 'Courier New', monospace; }
    .meta { font-size: 13px; color: #64748b; margin: 0; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 24px 0; }
    .security-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; }
    .security-title { font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 4px; }
    .security-text { font-size: 13px; color: #a16207; margin: 0; line-height: 1.5; }
    .footer { padding: 24px 40px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; }
    .footer-text { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; }
    @media (max-width: 560px) {
      .body, .footer { padding-left: 24px; padding-right: 24px; }
      .otp-code { font-size: 36px; letter-spacing: 8px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="header-brand">
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <span class="header-name">Ledger Pro</span>
        </div>
      </div>

      <!-- Body -->
      <div class="body">
        <h1 class="greeting">Verify your email address</h1>
        <p class="intro">
          Thanks for registering. To complete your account setup, please use the
          verification code below. It will expire in <strong>{{ $expiryMinutes }} minutes</strong>.
        </p>

        <p class="otp-label">Your verification code</p>
        <div class="otp-box">
          <div class="otp-code">{{ $otp }}</div>
        </div>

        <p class="meta">
          Enter this code on the verification screen to activate your account.
        </p>

        <hr class="divider" />

        <div class="security-box">
          <p class="security-title">🔒 Security notice</p>
          <p class="security-text">
            Never share this code with anyone. Ledger Pro will never ask for your
            verification code via phone, chat, or email.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">
          This email was sent to <strong>{{ $recipientEmail }}</strong> because an account was created
          on Ledger Pro using this address.<br />
          If you did not register, you can safely ignore this email.
        </p>
        <p class="footer-text" style="margin-top: 8px;">
          &copy; {{ date('Y') }} Ledger Pro &middot; All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
