<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify New Email Address</title>
</head>
<body style="font-family: sans-serif; padding: 20px;">
    <h2>Verify New Email Address</h2>
    <p>We received a request to change your account email address to this one. Use the verification code below to verify ownership of this email address.</p>
    
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
        {{ $otp }}
    </div>

    <p>This code will expire in {{ $expiryMinutes }} minutes.</p>
    <p>If you did not request this, you can safely ignore this email and your account will remain associated with your old email address.</p>
</body>
</html>
