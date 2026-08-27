'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  Boxes,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Step 1 State: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 2 State: 2FA OTP
  const [is2FA, setIs2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Resend Cooldown Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when switching to 2FA step
  useEffect(() => {
    if (is2FA) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [is2FA]);

  // Step 1: Submit Credentials
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const data = response.data?.data || response.data;

      // Case A: 2FA is required for this account / role
      if (data?.require2FA && data?.tempToken) {
        setIs2FA(true);
        setTempToken(data.tempToken);
        setMaskedEmail(data.email || email);
        setResendCooldown(60);
        setSuccessMsg(data.message || 'Verification code sent to your email.');
        return;
      }

      // Case B: Direct 1-Step Login
      if (data?.accessToken && data?.user) {
        setAuth(data.user, data.accessToken);
        router.push('/');
      } else {
        setErrorMsg('Login response did not contain expected session tokens.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Invalid email or password.');
      setErrorMsg(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP Digit Change & Auto-focus
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Digits only

    const newOtp = [...otp];
    // Take the last character typed
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are filled
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) {
      executeOtpVerification(fullOtp);
    }
  };

  // Handle Backspace Key Navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Full Code Clipboard Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
      executeOtpVerification(pastedData);
    }
  };

  // Step 2: Submit OTP Verification
  const executeOtpVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsVerifyingOtp(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        tempToken,
        otp: code,
      });

      const data = response.data?.data || response.data;
      if (data?.accessToken && data?.user) {
        setAuth(data.user, data.accessToken);
        router.push('/');
      } else {
        setErrorMsg('Failed to establish session. Please try logging in again.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : 'Invalid or expired verification code.');
      setErrorMsg(serverMsg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await api.post('/auth/resend-otp', { tempToken });
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setSuccessMsg(res.data?.message || 'New 6-digit verification code sent.');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Failed to resend verification code.',
      );
    } finally {
      setIsResending(false);
    }
  };

  // Back to Credentials Step
  const handleBackToLogin = () => {
    setIs2FA(false);
    setTempToken('');
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/60 backdrop-blur-sm transition-all duration-200">
          {/* Brand Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/30">
              {is2FA ? (
                <ShieldCheck className="h-7 w-7 text-white" />
              ) : (
                <Boxes className="h-7 w-7 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {is2FA ? 'Two-Factor Authentication' : 'Giant BD'}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {is2FA
                ? 'Enter the 6-digit verification code sent to your email'
                : 'Enterprise Warehouse & Commercial Operations Platform'}
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CREDENTIALS FORM */}
          {!is2FA ? (
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@giant-bd.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-70 transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <span>Sign in to Dashboard</span>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: 6-DIGIT OTP VERIFICATION */
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <span className="text-[11px] text-slate-500">Security code sent to:</span>
                <p className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                  {maskedEmail}
                </p>
              </div>

              {/* 6 Interactive PIN Inputs */}
              <div>
                <label className="mb-2 block text-center text-xs font-semibold text-slate-700">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`h-12 w-11 rounded-xl border text-center font-mono text-xl font-extrabold transition-all duration-150 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                        digit
                          ? 'border-blue-600 bg-blue-50/30 text-blue-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-900'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit OTP Button */}
              <button
                type="button"
                disabled={isVerifyingOtp || otp.join('').length !== 6}
                onClick={() => executeOtpVerification()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition cursor-pointer"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <span>Verify & Access Account</span>
                )}
              </button>

              {/* Resend & Cooldown Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to login</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-400">
              Giant BD ERP System • Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
