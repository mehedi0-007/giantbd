'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { GiantLogo } from '@/components/common/giant-logo';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  HelpCircle,
  X,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();

  // Step 1: Credential State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 2: 2FA OTP State
  const [is2FA, setIs2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first OTP input when 2FA is triggered
  useEffect(() => {
    if (is2FA) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 500);
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

      // Case A: 2FA required by role or user policy
      if (data?.require2FA && data?.tempToken) {
        setIs2FA(true);
        setTempToken(data.tempToken);
        setMaskedEmail(data.email || email);
        setResendCooldown(60);
        return;
      }

      // Case B: Direct Login
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

  // Step 2: Handle OTP input & auto advance
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
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
      setSuccessMsg(res.data?.message || 'New verification code sent to your email.');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Failed to resend verification code.',
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    setIs2FA(false);
    setTempToken('');
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f6fa] p-4 sm:p-6 lg:p-8 selection:bg-[#3b66b7] selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#3b66b7]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#3b66b7]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Dual-Panel Card Container */}
      <div className="relative w-full max-w-4xl min-h-[520px] bg-white rounded-3xl shadow-2xl shadow-slate-300/60 overflow-hidden flex flex-col md:flex-row border border-slate-100">

        {/* ========================================================================= */}
        {/* DESKTOP SLIDING BLUE BANNER (Slides smoothly across Left <-> Right)      */}
        {/* ========================================================================= */}
        <div
          className={`hidden md:flex absolute top-0 bottom-0 w-1/2 bg-[#3b66b7] text-white flex-col items-center justify-center p-10 z-20 transition-all duration-1000 ease-in-out shadow-xl ${is2FA
            ? 'left-1/2 rounded-tl-[130px] rounded-bl-[130px] rounded-tr-[0px] rounded-br-[0px]'
            : 'left-0 rounded-tr-[130px] rounded-br-[130px] rounded-tl-[0px] rounded-bl-[0px]'
            }`}
        >
          <div className="flex flex-col items-center text-center space-y-4 px-4 select-none">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-snug tracking-tight">
              Welcome to<br />
              <span className="text-white/95">Giant BD ERP</span>
            </h1>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE BANNER (Visible on small screens)                                  */}
        {/* ========================================================================= */}
        <div className="md:hidden w-full bg-[#3b66b7] text-white p-8 rounded-b-[40px] flex flex-col items-center text-center shadow-md">
          <h1 className="text-2xl font-extrabold leading-tight">
            Welcome to<br />Giant BD ERP
          </h1>
          <p className="text-xs text-white/70 mt-1">Enterprise Operations Platform</p>
        </div>

        {/* ========================================================================= */}
        {/* PANEL A: 2FA OTP VERIFICATION (Stationed on the Left Half)                */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-1/2 flex flex-col justify-center items-center px-6 py-10 sm:px-12 md:absolute md:left-0 md:top-0 md:bottom-0 z-10 transition-all duration-500 ${is2FA
            ? 'opacity-100 pointer-events-auto translate-x-0'
            : 'hidden md:flex md:opacity-0 md:pointer-events-none md:-translate-x-6'
            }`}
        >
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Logo */}
            <div className="mb-6">
              <GiantLogo className="h-30 w-auto" width={260} height={90} />
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight text-center">
              Verify Your Identity
            </h2>
            <p className="text-xs text-slate-500 text-center mt-1.5 mb-6 max-w-xs leading-relaxed">
              We&apos;ve sent a 6-digit code to<br />
              <span className="font-semibold text-slate-700">{maskedEmail || email}</span>
            </p>

            {/* Error / Success Feedback */}
            {errorMsg && (
              <div className="w-full mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="w-full mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 6 Discrete OTP Input Blocks */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full mb-6" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isVerifyingOtp}
                  className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-bold rounded-xl bg-[#f4f7fc] text-slate-800 border border-slate-200/80 focus:border-[#3b66b7] focus:bg-white focus:ring-3 focus:ring-[#3b66b7]/20 outline-hidden transition-all duration-150 shadow-xs"
                />
              ))}
            </div>

            {/* Verify Code Button */}
            <button
              type="button"
              onClick={() => executeOtpVerification()}
              disabled={isVerifyingOtp || otp.join('').length !== 6}
              className="w-full py-3.5 px-4 bg-[#3b66b7] hover:bg-[#32589f] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#3b66b7]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend Timer / Action */}
            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <span className="text-xs text-slate-400 font-medium">
                  Resend code in <span className="font-semibold text-slate-600">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-xs font-semibold text-[#3b66b7] hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Resend verification code
                </button>
              )}
            </div>

            {/* Back to Credentials Link */}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="mt-6 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL B: CREDENTIALS LOGIN (Stationed on the Right Half)                   */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-1/2 flex flex-col justify-center items-center px-6 py-10 sm:px-12 md:absolute md:right-0 md:top-0 md:bottom-0 z-10 transition-all duration-500 ${!is2FA
            ? 'opacity-100 pointer-events-auto translate-x-0'
            : 'hidden md:flex md:opacity-0 md:pointer-events-none md:translate-x-6'
            }`}
        >
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Logo */}
            <div className="mb-8">
              <GiantLogo className="h-35 w-auto" width={300} height={110} />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="w-full mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCredentialSubmit} className="w-full space-y-4">
              {/* Email Input */}
              <div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Email"
                  className="w-full rounded-xl bg-[#f4faff] border border-transparent focus:border-[#3b66b7]/40 focus:bg-white py-3.5 px-4 text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition-all duration-150 shadow-sm"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl bg-[#f4faff] border border-transparent focus:border-[#3b66b7]/40 focus:bg-white py-3.5 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-hidden transition-all duration-150 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-[#3b66b7] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#3b66b7] hover:bg-[#32589f] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#3b66b7]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD HELPER MODAL                                              */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3 text-slate-900">
              <div className="p-2.5 rounded-xl bg-[#3b66b7]/10 text-[#3b66b7]">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold">Password Assistance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Password self-service reset is managed securely by Giant BD IT Security. Please contact your System Administrator to request a temporary credentials reset token.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-[#3b66b7] hover:bg-[#32589f] text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
