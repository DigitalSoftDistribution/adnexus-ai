// @ts-nocheck
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SEO from '../components/SEO';

const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

const fadeVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/* ═════════════ password strength ═════════════ */
const strengthConfig = [
  { label: 'Weak', color: '#EF4444' },
  { label: 'Fair', color: '#F59E0B' },
  { label: 'Good', color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

function getStrength(val: string): number {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) s++;
  if (/\d/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  return s;
}

/* ═════════════ Zod Schemas ═════════════ */
const requestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RequestForm = z.infer<typeof requestSchema>;
type ResetForm = z.infer<typeof resetSchema>;

/* ══════════════════════════════════════════ */
export default function ForgotPassword() {
  const { resetPassword, updatePassword, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'request' | 'sent' | 'reset' | 'success'>(
    'request'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* Check URL for reset token */
  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    if (token || type === 'recovery') {
      setMode('reset');
    }
  }, [searchParams]);

  /* Countdown timer for resend */
  useEffect(() => {
    if (mode !== 'sent') return;
    setCanResend(false);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  /* Request form */
  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });

  /* Reset form */
  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const resetPasswordValue = resetForm.watch('password');
  const strength = getStrength(resetPasswordValue);

  /* ─── Handle send reset link ─── */
  const handleSendLink = async (data: RequestForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await resetPassword(data.email);
      setSentEmail(data.email);
      setMode('sent');
      toast.success('Reset link sent to your email');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset link';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Handle resend ─── */
  const handleResend = () => {
    if (!canResend || !sentEmail) return;
    requestForm.setValue('email', sentEmail);
    setMode('request');
    setTimeout(() => {
      requestForm.handleSubmit(handleSendLink)();
    }, 50);
  };

  /* ─── Handle password reset ─── */
  const handleResetPassword = async (data: ResetForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updatePassword(data.password);
      setMode('success');
      toast.success('Password updated successfully');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset password';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <SEO
      title="Forgot Password"
      description="Reset your AdNexus AI password. Enter your email to receive a secure password reset link."
      keywords="forgot password, password reset, account recovery"
      noindex
    />
    <div
      className="flex min-h-[100dvh] w-full items-center justify-center px-6 py-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeSmooth }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="font-space text-xl font-bold tracking-tight">
            AdNexus
          </span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
          />
        </Link>

        <AnimatePresence mode="wait">
          {/* ═══════════ MODE 1: Request ═══════════ */}
          {mode === 'request' && (
            <motion.div
              key="request"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: easeSmooth }}
            >
              <h2
                className="text-center font-space text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Reset your password
              </h2>
              <p
                className="mt-2 text-center text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                Enter your email and we&apos;ll send you a reset link
              </p>

              {/* Demo mode banner */}
              {isDemoMode && (
                <div
                  className="mb-4 mt-3 px-3 py-2 rounded-lg text-xs text-center"
                  style={{
                    background: 'rgba(195,245,59,0.1)',
                    border: '1px solid rgba(195,245,59,0.2)',
                    color: '#c3f53b',
                  }}
                >
                  Demo Mode — Reset link will be simulated. No real email will be sent.
                </div>
              )}

              <Form {...requestForm}>
                <form
                  onSubmit={requestForm.handleSubmit(handleSendLink)}
                  className="mt-8 flex flex-col gap-4"
                >
                  {submitError && (
                    <Alert
                      variant="destructive"
                      className="border-red-500/20 bg-red-500/10 text-red-400"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={requestForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={{ color: 'var(--text-secondary)' }}>
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              size={18}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                              style={{ color: 'var(--text-tertiary)' }}
                            />
                            <Input
                              type="email"
                              placeholder="you@company.com"
                              disabled={isSubmitting}
                              className="h-11 w-full rounded-lg border bg-[#1a1a1a] pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                              style={{ borderColor: 'var(--border-subtle)' }}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 flex h-11 w-full items-center justify-center rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

          {/* ═══════════ MODE 2: Sent ═══════════ */}
          {mode === 'sent' && (
            <motion.div
              key="sent"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: easeSmooth }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <Check size={40} style={{ color: 'var(--status-active)' }} />
              </motion.div>

              <h2
                className="font-space text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Check your email
              </h2>
              <p
                className="mt-2 text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                We&apos;ve sent a password reset link to{' '}
                <span style={{ color: 'var(--text-primary)' }}>
                  {sentEmail || '***@company.com'}
                </span>
              </p>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || isSubmitting}
                  className="text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    color: canResend ? 'var(--accent)' : 'var(--text-tertiary)',
                  }}
                >
                  {canResend ? 'Resend email' : `Resend in ${countdown}s`}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Already clicked the link?{' '}
                  <span
                    className="cursor-pointer font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                  >
                    Create new password
                  </span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

          {/* ═══════════ MODE 3: Reset Password ═══════════ */}
          {mode === 'reset' && (
            <motion.div
              key="reset"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: easeSmooth }}
            >
              <h2
                className="text-center font-space text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Create new password
              </h2>
              <p
                className="mt-2 text-center text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                Make sure it&apos;s at least 8 characters with mixed case,
                numbers, and symbols
              </p>

              <Form {...resetForm}>
                <form
                  onSubmit={resetForm.handleSubmit(handleResetPassword)}
                  className="mt-8 flex flex-col gap-4"
                >
                  {submitError && (
                    <Alert
                      variant="destructive"
                      className="border-red-500/20 bg-red-500/10 text-red-400"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  {/* New Password */}
                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          New password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock
                              size={18}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                              style={{ color: 'var(--text-tertiary)' }}
                            />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter new password"
                              disabled={isSubmitting}
                              className="h-11 w-full rounded-lg border bg-[#1a1a1a] pl-10 pr-10 text-sm text-white outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                              style={{
                                borderColor: 'var(--border-subtle)',
                              }}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                              style={{ color: 'var(--text-tertiary)' }}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />

                        {/* Password strength indicator */}
                        {resetPasswordValue.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                Password strength
                              </span>
                              <span
                                className="text-xs font-medium"
                                style={{
                                  color:
                                    strengthConfig[strength - 1]?.color ||
                                    '#EF4444',
                                }}
                              >
                                {strength === 0
                                  ? 'Weak'
                                  : strengthConfig[strength - 1]?.label}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((level) => (
                                <div
                                  key={level}
                                  className="h-1 flex-1 rounded-full transition-all duration-300"
                                  style={{
                                    background:
                                      level <= strength
                                        ? strengthConfig[strength - 1]?.color
                                        : 'rgba(255,255,255,0.1)',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Confirm New Password */}
                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Confirm password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock
                              size={18}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                              style={{ color: 'var(--text-tertiary)' }}
                            />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Re-enter new password"
                              disabled={isSubmitting}
                              className="h-11 w-full rounded-lg border bg-[#1a1a1a] pl-10 pr-10 text-sm text-white outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                              style={{
                                borderColor: 'var(--border-subtle)',
                              }}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                              style={{ color: 'var(--text-tertiary)' }}
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting || !resetForm.formState.isValid}
                    className="mt-1 flex h-11 w-full items-center justify-center rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link
                  to="/signin"
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--accent)' }}
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          )}

          {/* ═══════════ MODE 4: Success ═══════════ */}
          {mode === 'success' && (
            <motion.div
              key="success"
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: easeSmooth }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <Check size={40} style={{ color: 'var(--status-active)' }} />
              </motion.div>

              <h2
                className="font-space text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Password updated
              </h2>
              <p
                className="mt-2 text-base"
                style={{ color: 'var(--text-secondary)' }}
              >
                Your password has been reset successfully. You can now sign in
                with your new password.
              </p>

              <Button
                onClick={() => navigate('/signin')}
                className="mt-8 h-11 px-8 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                Go to Sign In
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
}
