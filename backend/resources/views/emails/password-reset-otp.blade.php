<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: sans-serif; padding: 20px;">
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password. Use the verification code below to proceed.</p>
    
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
        {{ $otp }}
    </div>

    <p>This code will expire in {{ $expiryMinutes }} minutes.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
</body>
</html>
