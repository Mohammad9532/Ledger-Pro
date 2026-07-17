import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Router state set by VerifyEmailPage after successful verification
  const verifiedState = location.state as { verified?: boolean; email?: string } | null;

  const [email, setEmail] = useState(verifiedState?.email ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear the router state from history so a refresh doesn't re-show the banner
  useEffect(() => {
    if (verifiedState?.verified) {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const clearErrors = () => {
    setFieldError('');
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    clearErrors();

    if (!email.trim()) {
      setFieldError('email');
      return;
    }

    setLoading(true);
    try {
      const destination = await login(email, password, rememberMe);
      navigate(destination === 'onboarding' ? '/onboarding' : '/', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const message: string = err.response?.data?.message ?? '';

      if (!err.response || status === 0) {
        setGeneralError('Unable to connect to the server. Please check your connection.');
      } else if (status >= 500) {
        setGeneralError('An unexpected server error occurred. Please try again in a moment.');
      } else if (status === 403 && message) {
        // Email not verified — give a clear, actionable message
        setFieldError(message + ' Please check your inbox.');
      } else if (status === 422) {
        setFieldError(message || 'The provided credentials are incorrect.');
      } else {
        setFieldError(message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your Ledger Pro account</p>
      </div>

      {/* Email verified success banner */}
      {verifiedState?.verified && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-700 dark:text-green-400 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Your email has been verified! You can now sign in.</span>
        </div>
      )}

      {/* Infrastructure error */}
      {generalError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => { setEmail(e.target.value); clearErrors(); }}
            placeholder="you@company.com"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <button
              type="button"
              tabIndex={-1}
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearErrors(); }}
              placeholder="••••••••"
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
        </div>

        {/* Credential error — displayed between password and submit */}
        {fieldError && (
          <p className="text-destructive text-sm animate-fade-in">{fieldError}</p>
        )}

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed"
          />
          <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer select-none">
            Keep me signed in
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in...</>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
