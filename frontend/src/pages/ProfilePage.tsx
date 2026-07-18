import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, User, Lock, Mail, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator';
import api from '@/lib/api';

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  
  // Personal Info State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Unsaved changes check
  useEffect(() => {
    const hasUnsavedChanges = name !== user?.name || phone !== (user?.phone || '');
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [name, phone, user]);

  // Security (Password) State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email Change State
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update effect if user context updates
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  // --- Handlers ---

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoSuccess(false);
    try {
      await api.put('/profile', { name, phone });
      await fetchUser();
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);
    try {
      await api.put('/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError('');
    try {
      await api.post('/profile/email/request', { new_email: newEmail });
      setOtpSent(true);
      setTimeout(() => emailOtpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Failed to request email change.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = emailOtp.join('');
    if (code.length < 6) return;
    
    setSavingEmail(true);
    setEmailError('');
    try {
      await api.post('/profile/email/verify', { code });
      await fetchUser();
      setEmailSuccess(true);
      setIsChangingEmail(false);
      setOtpSent(false);
      setNewEmail('');
      setEmailOtp(['', '', '', '', '', '']);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err: any) {
      setEmailError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...emailOtp];
    newOtp[index] = value.substring(value.length - 1);
    setEmailOtp(newOtp);
    if (value && index < 5) emailOtpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !emailOtp[index] && index > 0) emailOtpRefs.current[index - 1]?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and security preferences.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <CardDescription>Update your basic profile details.</CardDescription>
          </CardHeader>
          <CardContent>
            {infoSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-700 dark:text-green-400 text-sm flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully.
              </div>
            )}
            {name !== user?.name && !infoSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-700 dark:text-yellow-400 text-sm animate-fade-in">
                You have unsaved changes.
              </div>
            )}
            <form onSubmit={handleSaveInfo} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={savingInfo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} disabled={savingInfo} />
              </div>
              <Button type="submit" disabled={savingInfo || (name === user?.name && phone === (user?.phone || ''))}>
                {savingInfo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security (Password) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
          </CardHeader>
          <CardContent>
            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-700 dark:text-green-400 text-sm flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Password changed successfully.
              </div>
            )}
            {passwordError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {passwordError}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input 
                    id="current-password" 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    required 
                    disabled={savingPassword} 
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input 
                    id="new-password" 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    disabled={savingPassword} 
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && <PasswordStrengthIndicator password={newPassword} />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type={showNewPassword ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  disabled={savingPassword} 
                />
              </div>
              <Button type="submit" disabled={savingPassword || !currentPassword || newPassword.length < 8}>
                {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Email Address</CardTitle>
            </div>
            <CardDescription>Manage the email address associated with your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {emailSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-700 dark:text-green-400 text-sm flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Email address updated successfully.
              </div>
            )}
            
            {!isChangingEmail ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Current Email</Label>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <Button variant="outline" onClick={() => setIsChangingEmail(true)}>
                  Change Email
                </Button>
              </div>
            ) : (
              <div className="max-w-md space-y-4 animate-fade-in">
                {emailError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {emailError}
                  </div>
                )}
                
                {!otpSent ? (
                  <form onSubmit={handleRequestEmailChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">New Email Address</Label>
                      <Input 
                        id="new-email" 
                        type="email" 
                        value={newEmail} 
                        onChange={e => setNewEmail(e.target.value)} 
                        required 
                        disabled={savingEmail} 
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={savingEmail || !newEmail || newEmail === user?.email}>
                        {savingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Send Verification Code
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setIsChangingEmail(false)} disabled={savingEmail}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailChange} className="space-y-6 animate-slide-up">
                    <div className="space-y-2 text-center">
                      <Label>Verify New Email</Label>
                      <p className="text-xs text-muted-foreground mb-4">Enter the 6-digit code sent to <b>{newEmail}</b></p>
                      <div className="flex justify-center gap-2 mt-2">
                        {emailOtp.map((digit, index) => (
                          <Input
                            key={index}
                            ref={el => emailOtpRefs.current[index] = el}
                            type="text"
                            inputMode="numeric"
                            value={digit}
                            onChange={e => handleOtpChange(index, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(index, e)}
                            className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 focus-visible:ring-0 focus-visible:border-primary"
                            maxLength={1}
                            disabled={savingEmail}
                            required
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <Button type="submit" className="w-full" disabled={savingEmail || emailOtp.join('').length < 6}>
                        {savingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Verify & Update Email
                      </Button>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setEmailError(''); }}
                        disabled={savingEmail}
                        className="text-sm text-primary hover:underline"
                      >
                        Change email address
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
