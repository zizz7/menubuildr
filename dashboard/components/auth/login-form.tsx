'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthForm } from '@/lib/hooks/useAuthForm';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { error, loading, handleSubmit } = useAuthForm({ endpoint: '/auth/login' });
  const searchParams = useSearchParams();
  const googleError = searchParams.get('error') === 'google_auth_failed';

  return (
    <div className="w-full">
      <span className="block font-[var(--font-dm-mono)] text-[10px] tracking-[0.12em] uppercase text-[#8B7355] mb-2.5">
        Welcome back
      </span>
      <h2 className="font-[var(--font-cormorant)] text-[2.4rem] font-bold text-[#1A3C2E] tracking-tight leading-[1.05] mb-2">
        Sign in
      </h2>
      <p className="text-[0.875rem] text-[#8B7355] mb-10 leading-relaxed">
        Access your MenuBuildr account
      </p>

      <form onSubmit={(e) => handleSubmit(e, { email, password })}>
        {googleError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-[10px] mb-4" role="alert">
            Google sign-in failed. Please try again or use email/password.
          </div>
        )}
        {/* Email */}
        <div className="mb-5">
          <label htmlFor="email" className="block text-[0.8rem] font-medium text-[#1A3C2E] mb-[7px] tracking-[0.01em]">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full py-[13px] px-4 bg-white border-[1.5px] border-[rgba(26,60,46,0.14)] rounded-[10px] font-[var(--font-dm-sans)] text-[0.9rem] text-[#1A3C2E] outline-none transition-all duration-200 placeholder:text-[rgba(139,115,85,0.45)] focus:border-[#E8A838] focus:shadow-[0_0_0_3px_rgba(232,168,56,0.13)]"
          />
        </div>

        {/* Password */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-[7px]">
            <label htmlFor="password" className="text-[0.8rem] font-medium text-[#1A3C2E] tracking-[0.01em]">
              Password
            </label>
            <a href="#" className="text-[0.78rem] text-[#8B7355] no-underline hover:text-[#1A3C2E] transition-colors">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full py-[13px] px-4 pr-[46px] bg-white border-[1.5px] border-[rgba(26,60,46,0.14)] rounded-[10px] font-[var(--font-dm-sans)] text-[0.9rem] text-[#1A3C2E] outline-none transition-all duration-200 placeholder:text-[rgba(139,115,85,0.45)] focus:border-[#E8A838] focus:shadow-[0_0_0_3px_rgba(232,168,56,0.13)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
              className="absolute right-[14px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[rgba(139,115,85,0.5)] p-0 hover:text-[#1A3C2E] transition-colors flex items-center"
            >
              {showPassword ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-[10px] mb-4" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[14px] bg-[#1A3C2E] text-[#F9F6F0] font-[var(--font-dm-sans)] text-[0.95rem] font-semibold border-none rounded-[10px] cursor-pointer transition-all duration-250 mt-2 tracking-[0.01em] relative overflow-hidden hover:bg-[#1f4736] hover:shadow-[0_8px_28px_rgba(26,60,46,0.25)] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-[14px] my-6">
        <div className="flex-1 h-px bg-[rgba(26,60,46,0.1)]" />
        <span className="font-[var(--font-dm-mono)] text-[10px] tracking-[0.1em] uppercase text-[rgba(139,115,85,0.55)]">or</span>
        <div className="flex-1 h-px bg-[rgba(26,60,46,0.1)]" />
      </div>

      {/* Google SSO */}
      <button
        type="button"
        onClick={() => {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:5000/api`;
          window.location.href = `${apiUrl}/auth/google`;
        }}
        className="w-full py-[13px] bg-white text-[#1A3C2E] font-[var(--font-dm-sans)] text-[0.9rem] font-medium border-[1.5px] border-[rgba(26,60,46,0.13)] rounded-[10px] cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 hover:border-[rgba(26,60,46,0.28)] hover:shadow-[0_4px_16px_rgba(26,60,46,0.07)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      {/* Footer */}
      <p className="text-center mt-7 text-[0.85rem] text-[#8B7355]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#1A3C2E] font-semibold no-underline border-b-[1.5px] border-[#E8A838] pb-[1px] hover:opacity-75 transition-opacity">
          Sign up
        </Link>
      </p>
      <a href="https://menubuildr.com" className="flex items-center justify-center gap-1.5 mt-5 text-[0.8rem] text-[rgba(139,115,85,0.6)] no-underline hover:text-[#1A3C2E] transition-colors font-[var(--font-dm-mono)] tracking-[0.04em]">
        <ArrowLeft className="w-[13px] h-[13px]" />
        Back to home
      </a>
    </div>
  );
}
