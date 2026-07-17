import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, MailCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

// Map backend error messages to friendly, specific UI messages
function mapError(err: any): { message: string; type: 'field' | 'general' } {
  const status = err.response?.status;
  const message: string = err.response?.data?.message ?? '';

  if (!err.response || status === 0) {
    return { message: 'Unable to connect to the server. Please check your connection.', type: 'general' };
  }
  if (status >= 500) {
    return { message: 'A server error occurred. Please try again in a moment.', type: 'general' };
  }
  if (status === 429) {
    if (message.toLowerCase().includes('resend') || message.toLowerCase().includes('throttle')) {
      return { message: 'Too many resend requests. Please wait before requesting a new code.', type: 'general' };
    }
    return { message: 'Too many incorrect attempts. A new code has been sent to your email.', type: 'field' };
  }
  if (status === 400) {
    if (message.toLowerCase().includes('expired')) {
      return { message: 'This code has expired. Please request a new one.', type: 'field' };
    }
    return { message: 'Incorrect code. Please try again.', type: 'field' };
  }
  return { message: message || 'Verification failed. Please try again.', type: 'field' };
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get('email') ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [fieldError, setFieldError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const code = digits.join('');

  const clearErrors = () => {
    setFieldError('');
    setGeneralError('');
    setSuccessMessage('');
  };

  const handleDigitChange = (idx: number, value: string) => {
    clearErrors();
    // Allow paste of full code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
      const next = [...digits];
      for (let i = 0; i < CODE_LENGTH; i++) {
        next[i] = pasted[i] ?? '';
      }
      setDigits(next);
      const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleVerify = useCallback(async (overrideCode?: string) => {
    const finalCode = overrideCode ?? code;
    if (finalCode.length !== CODE_LENGTH || loading) return;

    clearErrors();
    setLoading(true);
    try {
      await api.post('/verify-email', { email, code: finalCode });
      navigate('/login', {
        replace: true,
        state: { verified: true, email },
      });
    } catch (err: any) {
      const { message, type } = mapError(err);
      if (type === 'field') {
        setFieldError(message);
      } else {
        setGeneralError(message);
      }
      // Clear digit boxes on field-level error so user can retype cleanly
      if (type === 'field') {
        setDigits(Array(CODE_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  }, [code, email, loading, navigate]);

  // Auto-submit once all digits are filled
  useEffect(() => {
    if (code.length === CODE_LENGTH && !loading) {
      handleVerify(code);
    }
  }, [code]);

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;
    clearErrors();
    setResendLoading(true);
    try {
      await api.post('/resend-verification', { email });
      setSuccessMessage('A new code has been sent to your email.');
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const { message } = mapError(err);
      setGeneralError(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We've sent a 6-digit verification code to{' '}
            <span className="font-medium text-foreground break-all">{email || 'your email address'}</span>.
          </p>
        </div>
      </div>

      {/* General error */}
      {generalError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
          {generalError}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* OTP digit boxes */}
      <div className="space-y-3">
        <div className="flex gap-2 justify-between">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              id={`otp-digit-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={6} // allow 6 for paste detection
              value={digit}
              onChange={e => handleDigitChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onFocus={e => e.target.select()}
              disabled={loading}
              className={[
                'w-full aspect-square text-center text-xl font-bold rounded-xl border-2 bg-background',
                'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fieldError
                  ? 'border-destructive focus:border-destructive'
                  : digit
                  ? 'border-primary focus:border-primary'
                  : 'border-border focus:border-primary',
              ].join(' ')}
              aria-label={`Digit ${idx + 1}`}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        {/* Field error lives directly under the boxes */}
        {fieldError && (
          <p className="text-destructive text-sm text-center animate-fade-in">{fieldError}</p>
        )}
      </div>

      {/* Verify button */}
      <Button
        className="w-full"
        onClick={() => handleVerify()}
        disabled={code.length !== CODE_LENGTH || loading}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying...</>
        ) : (
          'Verify Email'
        )}
      </Button>

      {/* Resend section */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">Didn't receive it?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resendLoading}
          className={[
            'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
            countdown > 0 || resendLoading
              ? 'text-muted-foreground cursor-not-allowed'
              : 'text-primary hover:underline cursor-pointer',
          ].join(' ')}
        >
          {resendLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</>
          ) : countdown > 0 ? (
            <><RefreshCw className="w-3.5 h-3.5" />Resend code in {countdown}s</>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5" />Resend code</>
          )}
        </button>
      </div>

      {/* Back to register */}
      <div className="pt-2 border-t">
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Register — wrong email?
        </Link>
      </div>
    </div>
  );
}
