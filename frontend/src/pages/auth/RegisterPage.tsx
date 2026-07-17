import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    company_name: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (generalError) setGeneralError('');
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.company_name.trim()) next.company_name = 'Company name is required.';
    if (!form.name.trim()) next.name = 'Your full name is required.';
    if (!form.email.trim()) next.email = 'Email address is required.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (form.password !== form.password_confirmation) next.password_confirmation = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;

    setLoading(true);
    setGeneralError('');
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
      });
      // Navigate to verify page, carrying the email so it can be pre-filled
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, { replace: true });
    } catch (err: any) {
      // Map Laravel validation errors (422) back to individual fields
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(serverErrors)) {
          mapped[field] = (messages as string[])[0];
        }
        setErrors(mapped);
      } else {
        // Infrastructure / unexpected errors — don't bind to a field
        const status = err.response?.status;
        if (!err.response || status === 0) {
          setGeneralError('Unable to connect to the server. Please check your connection.');
        } else if (status >= 500) {
          setGeneralError('An unexpected server error occurred. Please try again in a moment.');
        } else {
          setGeneralError(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Set up your company on Ledger Pro — free to start.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {generalError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {generalError}
          </div>
        )}

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company_name">Company name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="company_name"
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="Acme Corporation"
              className="pl-9"
              autoComplete="organization"
              required
            />
          </div>
          {errors.company_name && <p className="text-destructive text-xs">{errors.company_name}</p>}
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Your full name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Smith"
            autoComplete="name"
            required
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="register-email">Work email</Label>
          <Input
            id="register-email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="jane@acme.com"
            autoComplete="email"
            required
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="register-confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="register-confirm"
              type={showConfirm ? 'text' : 'password'}
              value={form.password_confirmation}
              onChange={set('password_confirmation')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password_confirmation && (
            <p className="text-destructive text-xs">{errors.password_confirmation}</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account...</>
          ) : (
            'Create account'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By registering you agree to our{' '}
          <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>{' '}
          and{' '}
          <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
