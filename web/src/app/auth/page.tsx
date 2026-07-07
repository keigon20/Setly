'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const { signInWithGoogle, signUp, login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/journal');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogle = async () => {
    clearError();
    setLocalError(null);
    setSubmitting(true);
    const ok = await signInWithGoogle();
    setSubmitting(false);
    if (ok) router.replace('/journal');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSubmitting(true);

    let ok = false;
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setLocalError('Display name is required');
        setSubmitting(false);
        return;
      }
      ok = await signUp(email, password, displayName.trim());
    } else {
      ok = await login(email, password);
    }

    setSubmitting(false);
    if (ok) router.replace('/journal');
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setLocalError(null);
    clearError();
  };

  const displayError = localError || error;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="mb-8">
        <Image src="/logo.png" alt="Setly" width={97} height={40} className="h-9 w-auto" priority />
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-textPrimary mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm text-textSecondary mb-6">
          {mode === 'login'
            ? 'Sign in to your Setly account'
            : 'Start journaling your live music moments'}
        </p>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-surfaceAlt border border-border text-textPrimary text-sm font-medium hover:bg-border transition-colors disabled:opacity-50 mb-4"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-textTertiary text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surfaceAlt border border-border text-textPrimary placeholder-textTertiary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-textSecondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-surfaceAlt border border-border text-textPrimary placeholder-textTertiary text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-textSecondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-lg bg-surfaceAlt border border-border text-textPrimary placeholder-textTertiary text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {displayError && (
            <p className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {displayError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-textSecondary mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={switchMode}
            className="text-accent hover:underline font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <p className="mt-6 text-xs text-textTertiary text-center max-w-xs">
        By continuing, you agree to our{' '}
        <Link href="/#terms" className="text-textSecondary hover:underline">
          Terms of Use
        </Link>{' '}
        and{' '}
        <Link href="/#privacy" className="text-textSecondary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4068 3.78409 7.83 3.96409 7.29V4.9581H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.3440C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9581L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z"
        fill="#EA4335"
      />
    </svg>
  );
}
