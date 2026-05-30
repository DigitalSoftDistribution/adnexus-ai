// @ts-nocheck
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  AlertCircle,
  Check,
  ArrowLeft,
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

/* ═══════════════ password strength ═══════════════ */
const strengthConfig = [
  { label: 'Weak', color: '#EF4444' },
  { label: 'Fair', color: '#F59E0B' },
  { label: 'Good', color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

function getStrength(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

/* ═══════════════ Zod Schema ═══════════════ */
const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

/* ═══════════════════════════════════════════════ */
export default function SignUp() {
  const { signup, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const password = form.watch('password');
  const strength = getStrength(password);

  const onSubmit = async (data: SignUpForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await signup(data.email, data.password, data.name);

      if (isDemoMode) {
        // In demo mode, signup already sets the user/session — go straight to dashboard
        toast.success('Welcome to AdNexus!');
        navigate('/dashboard');
        return;
      }

      setIsSuccess(true);
      toast.success('Check your email to confirm your account');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Success State ─── */
  if (isSuccess) {
    return (
      <>
      <SEO
        title="Sign Up"
      description="Create your AdNexus AI account. Start managing multi-channel ad campaigns with AI-powered optimization and intelligent automation."
      keywords="sign up, register, free trial, create account"
      />
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center px-6 py-12"
        style={{ background: 'var(--bg-primary)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeSmooth }}
          className="w-full max-w-md text-center"
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

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            <Check size={40} style={{ color: 'var(--status-active)' }} />
          </motion.div>

          <h2
            className="font-space text-3xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Check your email
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            We&apos;ve sent a confirmation link to{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              {form.getValues('email')}
            </span>
          </p>
          <p
            className="mt-4 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Click the link in the email to activate your account, then sign in.
          </p>

          <Button
            onClick={() => navigate('/signin')}
            className="mt-8 h-11 px-8 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Go to Sign In
          </Button>

          <div className="mt-6">
            <button
              onClick={() => {
                setIsSuccess(false);
                form.reset();
              }}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              Create another account
            </button>
          </div>
        </motion.div>
      </div>
      </>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] w-full"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ═══ LEFT — Visual side ═══ */}
      <div
        className="hidden xl:flex xl:w-[45%] relative items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #0a0a2e 100%)',
        }}
      >
        <div
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(37,99,235,0.06)' }}
        />
        <div
          className="absolute bottom-0 left-0 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'rgba(16,185,129,0.05)' }}
        />
        <div
          className="absolute top-1/3 left-1/4 h-48 w-48 rounded-full blur-3xl"
          style={{ background: 'rgba(0,242,234,0.04)' }}
        />

        {/* Animated cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 flex flex-col gap-6"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="p-5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <Check size={16} style={{ color: 'var(--status-active)' }} />
              </div>
              <span
                className="font-medium text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Workspace Created
              </span>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Your team workspace is ready to go
            </p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
            className="p-5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                <User size={16} style={{ color: 'var(--status-info)' }} />
              </div>
              <span
                className="font-medium text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Team Invited
              </span>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              3 team members added
            </p>
          </motion.div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="p-5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <Mail size={16} style={{ color: 'var(--status-warning)' }} />
              </div>
              <span
                className="font-medium text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Ad Account Connected
              </span>
            </div>
            <p
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Meta Ads - Active
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ═══ RIGHT — Form side ═══ */}
      <div className="flex w-full xl:w-[55%] items-start justify-center px-6 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeSmooth }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link
            to="/"
            className="mb-8 flex items-center gap-2"
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

          {/* Title */}
          <h2
            className="font-space text-4xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Create your account
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            Start your 14-day free trial — no credit card required
          </p>

          {/* Demo mode banner */}
          {isDemoMode && (
            <div
              className="mb-4 mt-3 px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'rgba(195,245,59,0.1)',
                border: '1px solid rgba(195,245,59,0.2)',
                color: '#c3f53b',
              }}
            >
              Demo Mode — Any info you enter will work. You&apos;ll be signed in immediately.
            </div>
          )}

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-8 flex flex-col gap-4"
            >
              {/* Global error */}
              {submitError && (
                <Alert
                  variant="destructive"
                  className="border-red-500/20 bg-red-500/10 text-red-400"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Full Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: 'var(--text-secondary)' }}>
                      Full name
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User
                          size={18}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                        <Input
                          type="text"
                          placeholder="John Doe"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-lg border bg-[#1a1a1a] pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                          style={{
                            borderColor: 'var(--border-subtle)',
                          }}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: 'var(--text-secondary)' }}>
                      Work email
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
                          placeholder="john@company.com"
                          disabled={isSubmitting}
                          className="h-11 w-full rounded-lg border bg-[#1a1a1a] pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                          style={{
                            borderColor: 'var(--border-subtle)',
                          }}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: 'var(--text-secondary)' }}>
                      Password
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
                          placeholder="Create a strong password"
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
                    {password.length > 0 && (
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
                              color: strengthConfig[strength - 1]?.color || '#EF4444',
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
                        <div
                          className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <span
                            className={
                              password.length >= 8 ? 'text-green-400' : ''
                            }
                          >
                            8+ chars
                          </span>
                          <span
                            className={
                              /[A-Z]/.test(password) && /[a-z]/.test(password)
                                ? 'text-green-400'
                                : ''
                            }
                          >
                            Mixed case
                          </span>
                          <span
                            className={
                              /\d/.test(password) ? 'text-green-400' : ''
                            }
                          >
                            Number
                          </span>
                          <span
                            className={
                              /[^A-Za-z0-9]/.test(password)
                                ? 'text-green-400'
                                : ''
                            }
                          >
                            Symbol
                          </span>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: 'var(--text-secondary)' }}>
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
                          placeholder="Re-enter your password"
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

              {/* Create Account button */}
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--accent)' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Divider */}
              <div className="my-2 flex items-center gap-4">
                <div
                  className="h-px flex-1"
                  style={{ background: 'var(--border-subtle)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  or continue with
                </span>
                <div
                  className="h-px flex-1"
                  style={{ background: 'var(--border-subtle)' }}
                />
              </div>

              {/* OAuth buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium text-gray-900 transition-all hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium text-gray-900 transition-all hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Microsoft
                </button>
              </div>
            </form>
          </Form>

          {/* Bottom link */}
          <div className="mt-6 text-center">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              <ArrowLeft size={16} />
              Already have an account? Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
