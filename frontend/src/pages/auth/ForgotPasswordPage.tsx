import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Email is required.'); return; }
    
    setError('');
    setLoading(true);
    try {
      await api.post('/password/forgot', { email });
      setStep(2);
      setResendTimer(60);
      // Auto-focus first OTP input slightly after render
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }

    setError('');
    setLoading(true);
    try {
      await api.post('/password/verify-otp', { email, code });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }

    setError('');
    setLoading(true);
    try {
      await api.post('/password/reset', { 
        email, 
        password,
        password_confirmation: passwordConfirm 
      });
      navigate('/login', { state: { verified: true, email } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(pastedData.length, 5);
      otpRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Recover Account</h1>
        <p className="text-muted-foreground text-sm">Reset your password to regain access</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between px-2 py-4 mb-4">
        <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <span className="text-xs font-medium">Email</span>
        </div>
        <div className={`flex-1 h-px mx-4 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
        <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <span className="text-xs font-medium">OTP</span>
        </div>
        <div className={`flex-1 h-px mx-4 ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
        <div className={`flex flex-col items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
          <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <span className="text-xs font-medium">Reset</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* STEP 1: Email */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-4 animate-slide-up">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      )}

      {/* STEP 2: OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-slide-up">
          <div className="space-y-2 text-center">
            <Label>Verification Code</Label>
            <p className="text-xs text-muted-foreground mb-4">Enter the 6-digit code sent to <b>{email}</b></p>
            <div className="flex justify-center gap-2 mt-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 focus-visible:ring-0 focus-visible:border-primary"
                  maxLength={1}
                  disabled={loading}
                  required
                />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <Button type="submit" className="w-full" disabled={loading || otp.join('').length < 6}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify Code <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
            
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={loading || resendTimer > 0}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive a code? Resend"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: New Password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4 animate-slide-up">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={password} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || password.length < 8}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Set New Password
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground pt-4">
        Remembered your password?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
