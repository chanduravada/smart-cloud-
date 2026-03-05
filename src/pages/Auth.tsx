import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Cloud, Loader2, Mail, Lock, User, Shield, Sparkles, Zap,
  CheckCircle2, ArrowLeft, RefreshCw, MailCheck, KeyRound
} from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type Step = 'credentials' | 'otp' | 'forgot' | 'reset';

const benefits = [
  { icon: Sparkles, text: 'AI-powered file classification' },
  { icon: Shield, text: 'SHA-256 duplicate detection' },
  { icon: Zap, text: 'Lightning fast cloud storage' },
];

// ─── OTP Input (4 digit boxes) ───────────────────────────────────────────────

interface OtpInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}

function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 3) refs.current[idx + 1]?.focus();
  };

  const onKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        const next = [...value]; next[idx] = ''; onChange(next);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const next = [...value]; next[idx - 1] = ''; onChange(next);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    else if (e.key === 'ArrowRight' && idx < 3) refs.current[idx + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = [...value];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    onChange(next);
    refs.current[Math.min(pasted.length, 3)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={e => set(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          onPaste={onPaste}
          onFocus={e => e.target.select()}
          className={cn(
            'w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200 bg-background',
            value[i] ? 'border-primary text-primary shadow-sm' : 'border-border text-foreground',
            'focus:border-primary focus:ring-4 focus:ring-primary/10',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

export default function Auth() {
  const { signIn, signUp, signOut, sendOtp, verifyOtp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  // OTP state
  const [step, setStep] = useState<Step>('credentials');
  const [otpEmail, setOtpEmail] = useState('');
  // Store credentials temporarily so we can re-sign-in after OTP verification
  const pendingCreds = useRef<{ email: string; password: string } | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  // Set to true after OTP verified — triggers navigation via useEffect
  const [otpVerified, setOtpVerified] = useState(false);

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [searchParams] = useSearchParams();

  // Detect password reset token in URL (?type=recovery)
  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setStep('reset');
    }
  }, [searchParams]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Navigate to dashboard once auth state has fully propagated after OTP verification
  useEffect(() => {
    if (otpVerified && user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [otpVerified, user, authLoading, navigate]);

  // Redirect already-logged-in users (but not while mid-OTP flow)
  if (!authLoading && user && step === 'credentials' && !otpVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── sendOtp helper ────────────────────────────────────────────────────────

  const triggerOtp = async (email: string): Promise<boolean> => {
    const { error } = await sendOtp(email);
    if (error) {
      const msg = error.message || 'Failed to send OTP';
      toast.error(
        msg.includes('not deployed') || msg.includes('CORS') || msg.includes('Failed to fetch')
          ? 'OTP service unreachable. Make sure the edge function is deployed.'
          : `Could not send OTP: ${msg}`
      );
      return false;
    }
    setOtpEmail(email);
    setOtpDigits(['', '', '', '']);
    setStep('otp');
    setResendCooldown(30);
    toast.success(`OTP sent to ${email}`);
    return true;
  };

  // ── Sign In ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }

    setIsLoading(true);
    // Store credentials — signIn() happens AFTER OTP verified (avoids race condition)
    pendingCreds.current = { email: loginEmail, password: loginPassword };
    const ok = await triggerOtp(loginEmail);
    if (!ok) pendingCreds.current = null;
    setIsLoading(false);
  };

  // ── Sign Up ───────────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }

    setIsLoading(true);
    // signUp does NOT create a session, so no race condition risk
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    if (error) {
      toast.error(error.message.includes('already registered')
        ? 'Email already registered. Sign in instead.'
        : error.message);
      setIsLoading(false);
      return;
    }
    // Store credentials for use after OTP verification
    pendingCreds.current = { email: signupEmail, password: signupPassword };
    const ok = await triggerOtp(signupEmail);
    if (!ok) { pendingCreds.current = null; }
    setIsLoading(false);
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 4) { toast.error('Please enter all 4 digits'); return; }

    setOtpLoading(true);
    const { error } = await verifyOtp(otpEmail, code);

    if (error) {
      toast.error('Invalid or expired OTP. Please try again.');
      setOtpDigits(['', '', '', '']);
      setOtpLoading(false);
      return;
    }

    // OTP verified — sign in for real now
    if (pendingCreds.current) {
      const { error: signInErr } = await signIn(
        pendingCreds.current.email,
        pendingCreds.current.password
      );
      pendingCreds.current = null;
      if (signInErr) {
        toast.error('Session error. Please sign in again.');
        setStep('credentials');
        setOtpLoading(false);
        return;
      }
    }

    toast.success('Verified! Welcome to Smart Cloud 🎉');
    // Don't navigate immediately — let useEffect do it once user state is set
    setOtpVerified(true);
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await triggerOtp(otpEmail);
  };

  // ── Forgot Password ───────────────────────────────────────────────────────

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(forgotEmail); }
    catch (err) { if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; } }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    setIsLoading(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Password reset link sent! Check your email.');
    setStep('credentials');
    setForgotEmail('');
  };

  // ── Reset Password (from email link) ─────────────────────────────────────

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    try { passwordSchema.parse(newPassword); }
    catch (err) { if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; } }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Password updated! You can now sign in.');
    setStep('credentials');
    setNewPassword('');
    setConfirmPassword('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative gradient-hero flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
            <Cloud className="h-6 w-6" style={{ color: 'hsl(222 47% 7%)' }} />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">Smart Cloud</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">
              Your files.<br />
              <span className="text-primary">Organized by AI.</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              Smart Cloud automatically classifies, tags, and organizes your files so you don't have to.
            </p>
          </div>
          <div className="space-y-4">
            {benefits.map(b => {
              const Icon = b.icon;
              return (
                <div key={b.text} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-white/85 text-sm font-medium">{b.text}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2.5 rounded-xl bg-accent/20">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">2-Step Verification</p>
              <p className="text-white/50 text-xs mt-0.5">4-digit OTP sent to your email</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex flex-wrap gap-2 mb-4">
            {['5GB Free', 'No Credit Card', 'Secure Storage'].map(badge => (
              <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span className="text-xs text-primary-foreground/70 font-medium">{badge}</span>
              </div>
            ))}
          </div>
          <p className="text-primary-foreground/35 text-xs">© {new Date().getFullYear()} Smart Cloud. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="p-2 rounded-xl gradient-primary shadow-glow">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Smart Cloud</span>
          </div>

          {/* ── OTP Step ─────────────────────────────────────── */}
          {step === 'otp' ? (
            <div className="animate-fade-in">
              <button
                onClick={() => { setStep('credentials'); pendingCreds.current = null; }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4">
                  <MailCheck className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Check your email</h2>
                <p className="text-muted-foreground text-sm">We sent a 4-digit code to</p>
                <p className="font-semibold text-sm text-primary mt-0.5 break-all">{otpEmail}</p>
              </div>

              <div className="mb-6">
                <OtpInput value={otpDigits} onChange={setOtpDigits} disabled={otpLoading} />
              </div>

              <Button
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpDigits.join('').length < 4}
                className="w-full h-12 gradient-primary font-semibold rounded-xl text-base"
              >
                {otpLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
                  : 'Verify & Sign In'}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-5">
                <p className="text-sm text-muted-foreground">Didn't receive it?</p>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                    resendCooldown > 0
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'text-primary hover:text-primary/80 cursor-pointer'
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Code expires in 10 minutes. Check your spam folder if needed.
              </p>
            </div>

          ) : step === 'forgot' ? (
            /* ── Forgot Password Step ────────────────────────────── */
            <div className="animate-fade-in">
              <button
                onClick={() => setStep('credentials')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Sign In
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4">
                  <KeyRound className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Reset Password</h2>
                <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 gradient-primary font-semibold rounded-xl" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</>
                    : <><MailCheck className="h-4 w-4 mr-2" />Send Reset Link</>
                  }
                </Button>
              </form>
            </div>

          ) : step === 'reset' ? (
            /* ── Reset Password Step (from email link) ────────────── */
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4">
                  <Lock className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Set New Password</h2>
                <p className="text-muted-foreground text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 gradient-primary font-semibold rounded-xl" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>
                    : 'Update Password'
                  }
                </Button>
              </form>
            </div>

          ) : (
            /* ── Credentials Step ─────────────────────────────── */
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-display font-bold">Get started</h2>
                <p className="text-muted-foreground mt-1 text-sm">Sign in or create a free account</p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg text-sm font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">Sign Up</TabsTrigger>
                </TabsList>

                {/* Sign In */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-email" type="email" placeholder="you@example.com"
                          value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                          className="pl-10 h-11 rounded-xl" disabled={isLoading} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login-password" type="password" placeholder="••••••••"
                          value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                          className="pl-10 h-11 rounded-xl" disabled={isLoading} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-primary font-semibold rounded-xl mt-2" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending OTP...</> : 'Sign In'}
                    </Button>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setStep('forgot')}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </form>
                  <div className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">A 4-digit code will be emailed after verifying your password.</p>
                  </div>
                </TabsContent>

                {/* Sign Up */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-name" type="text" placeholder="John Doe"
                          value={signupName} onChange={e => setSignupName(e.target.value)}
                          className="pl-10 h-11 rounded-xl" disabled={isLoading} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" placeholder="you@example.com"
                          value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                          className="pl-10 h-11 rounded-xl" disabled={isLoading} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" placeholder="Min. 6 characters"
                          value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                          className="pl-10 h-11 rounded-xl" disabled={isLoading} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 gradient-primary font-semibold rounded-xl mt-2" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending OTP...</> : 'Create Free Account'}
                    </Button>
                  </form>
                  <div className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">A 4-digit code will be emailed to verify your account.</p>
                  </div>
                </TabsContent>
              </Tabs>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By continuing you agree to our{' '}
                <span className="text-primary cursor-pointer hover:underline">Terms</span>
                {' '}and{' '}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
