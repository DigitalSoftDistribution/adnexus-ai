// @ts-nocheck
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TextInput } from '@/components/forms/TextInput';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { signInSchema, type SignInInput } from '@/lib/validation';
import SEO from '../components/SEO';

/* ─── easing ─── */
const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number];

/* ─── mini sparkline SVG ─── */
const Sparkline = () => {
  const path =
    'M0,28 L8,24 L16,26 L24,20 L32,22 L40,14 L48,16 L56,10 L64,12 L72,6 L80,8';
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="8" r="3" fill="var(--accent)" />
    </svg>
  );
};

/* ─── floating card ─── */
const FloatCard = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: easeSmooth }}
    className={`absolute ${className}`}
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: delay * 2,
      }}
      className="p-4 shadow-lg"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
      }}
    >
      {children}
    </motion.div>
  </motion.div>
);

/* ─── main page ─── */
export default function SignIn() {
  const { login, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  /* Load remembered email */
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('savedEmail');
    if (remembered === 'true' && savedEmail) {
      setValue('email', savedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data: SignInInput) => {
    setSubmitError(null);

    try {
      await login(data.email, data.password);

      /* Handle remember me */
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedEmail', data.email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedEmail');
      }

      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password';
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <>
    <SEO
      title="Sign In"
      description="Sign in to your AdNexus AI workspace to manage campaigns, view analytics, and access AI-powered marketing tools."
      keywords="sign in, login, AdNexus AI login"
    />
    <div className="flex min-h-[100dvh] w-full" style={{ background: 'var(--bg-primary)' }}>
      {/* ══════════════ LEFT SIDE - Form (55%) ══════════════ */}
      <div className="flex w-full lg:w-[55%] items-center justify-center px-6 py-12">
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
            Welcome back
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in to your ad intelligence dashboard
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
              Demo Mode — Use any email/password to sign in
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
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

            {/* Email */}
            <TextInput
              label="Email"
              name="email"
              type="email"
              placeholder="you@company.com"
              icon={<Mail size={18} />}
              register={register}
              error={errors.email?.message}
              required
              disabled={isSubmitting}
              autoComplete="email"
            />

            {/* Password */}
            <TextInput
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock size={18} />}
              register={register}
              error={errors.password?.message}
              required
              disabled={isSubmitting}
              autoComplete="current-password"
            />

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setValue('rememberMe', checked === true)
                  }
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border border-[var(--border-subtle)] bg-transparent data-[state=checked]:bg-[var(--accent)] data-[state=checked]:text-white"
                />
                <span
                  className="text-sm font-normal"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In button */}
            <SubmitButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              variant="primary"
              size="md"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </SubmitButton>

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

          {/* Bottom link */}
          <p
            className="mt-6 text-center text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ══════════════ RIGHT SIDE - Visual (45%) ══════════════ */}
      <div
        className="hidden lg:flex lg:w-[45%] relative items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #050505 0%, #0a1628 100%)',
        }}
      >
        {/* Decorative blurred circles */}
        <div
          className="absolute -top-20 -left-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(24,119,242,0.05)' }}
        />
        <div
          className="absolute top-1/3 -right-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'rgba(219,68,55,0.05)' }}
        />
        <div
          className="absolute bottom-20 left-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'rgba(16,185,129,0.04)' }}
        />

        {/* Floating metric cards */}
        <FloatCard className="top-[12%] left-[10%]" delay={0}>
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-glow)' }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                ROAS
              </div>
              <div
                className="font-semibold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                4.2x
              </div>
            </div>
            <Sparkline />
          </div>
        </FloatCard>

        <FloatCard className="top-[40%] right-[8%]" delay={0.3}>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: 'var(--meta-blue)' }}
            />
            <div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Meta Ads
              </div>
              <div
                className="font-semibold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                $12,450
              </div>
            </div>
          </div>
        </FloatCard>

        <FloatCard className="bottom-[20%] left-[5%]" delay={0.6}>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: 'var(--google-red)' }}
            />
            <div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Google Ads
              </div>
              <div
                className="font-semibold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                $8,230
              </div>
            </div>
          </div>
        </FloatCard>

        <FloatCard className="bottom-[8%] right-[12%]" delay={0.9}>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: 'var(--tiktok-cyan)' }}
            />
            <div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                TikTok Ads
              </div>
              <div
                className="font-semibold text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                $5,100
              </div>
            </div>
          </div>
        </FloatCard>

        {/* Center badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: easeSmooth }}
          className="relative z-10 flex flex-col items-center"
        >
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect
                x="4"
                y="16"
                width="14"
                height="20"
                rx="2"
                fill="var(--accent)"
                opacity="0.8"
              />
              <rect
                x="22"
                y="8"
                width="14"
                height="28"
                rx="2"
                fill="var(--accent)"
                opacity="0.5"
              />
            </svg>
          </div>
          <div
            className="font-space text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            AdNexus
          </div>
          <div
            className="mt-1 text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            AI-Powered Ad Intelligence
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}
