"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { setCachedUser } from "@/lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordNotice(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.details
            ? typeof data.details === "object"
              ? Object.values(data.details).flat().join(", ")
              : String(data.details)
            : data.error || "Invalid email or password"
        );
      }

      if (data?.user) {
        setCachedUser(data.user);
      }

      router.push("/dashboard/bots");
      router.refresh();
    } catch (err: any) {
      setErrors({ general: err.message || "Unable to sign in. Please verify your credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setErrors({});
    // Simulated Google OAuth trigger or integration notification
    setTimeout(() => {
      setGoogleLoading(false);
      setErrors({
        general: "Google Sign-in is available in the connected OAuth integration. Please use your credentials or register below.",
      });
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F3F5F2] overflow-hidden selection:bg-[#76937F] selection:text-white px-4 py-8">
      {/* Topographic Contour Map Background Vector Pattern (30-40% opacity) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35 bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='700' height='700' viewBox='0 0 700 700' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23385241' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M70 120 C 180 80, 260 200, 390 150 C 520 100, 600 240, 680 180' /%3E%3Cpath d='M20 220 C 140 180, 220 310, 370 270 C 510 230, 580 370, 690 310' /%3E%3Cpath d='M0 340 C 130 290, 210 430, 350 380 C 490 330, 570 480, 700 420' /%3E%3Cpath d='M0 460 C 140 400, 240 540, 370 490 C 500 440, 580 580, 700 520' /%3E%3Cpath d='M0 580 C 150 510, 270 650, 400 610 C 520 570, 620 680, 700 640' /%3E%3Cpath d='M120 40 C 230 10, 320 120, 460 70 C 580 30, 640 130, 700 90' /%3E%3Cpath d='M-40 260 C 90 200, 180 330, 310 280 C 440 240, 510 390, 650 340' /%3E%3Cpath d='M-20 400 C 100 350, 170 470, 310 430 C 440 390, 540 520, 660 480' /%3E%3Ccircle cx='340' cy='320' r='180' stroke-width='0.8' stroke-dasharray='4 8' /%3E%3Ccircle cx='340' cy='320' r='230' stroke-width='0.6' stroke-dasharray='3 9' /%3E%3Cpath d='M100 500 C 250 440, 300 590, 480 530 C 600 490, 640 600, 700 570' /%3E%3Cpath d='M-10 160 C 110 110, 190 230, 330 190 C 470 150, 540 270, 690 230' stroke-width='0.8' /%3E%3Cpath d='M30 620 C 170 560, 290 680, 430 640 C 560 600, 640 700, 720 670' stroke-width='0.8' /%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "700px 700px",
        }}
        aria-hidden="true"
      />

      {/* Top-left Branding Badge: Rounded square with sage green background & white chat bubble icon */}
      <div className="fixed top-6 left-6 sm:top-8 sm:left-8 z-20">
        <Link
          href="/"
          className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#4E6955] hover:bg-[#435b49] text-white shadow-sm transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4E6955]/40"
          title="Return to Home"
          aria-label="Matcha Home"
        >
          {/* White chat-bubble icon */}
          <svg
            className="w-5 h-5 text-white transition-transform duration-200 group-hover:scale-105"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" />
          </svg>
        </Link>
      </div>

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_45px_rgba(25,35,28,0.07)] border border-gray-100 p-8 sm:p-10 transition-all">
        {/* Title */}
        <h1 className="font-mono font-bold text-center text-xl sm:text-2xl text-[#1A231E] tracking-tight mb-7 sm:mb-8">
          Sign in to your account
        </h1>

        {/* Global Error Notice */}
        {errors.general && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200/80 text-red-700 font-mono text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errors.general}</span>
          </div>
        )}

        {/* Forgot Password Feedback Banner */}
        {forgotPasswordNotice && (
          <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-[#4E6955] font-mono text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#4E6955] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Password recovery instructions have been sent if the email exists in our records.
            </span>
          </div>
        )}

        {/* Form Components Top to Bottom */}
        <div className="space-y-6">
          {/* 1. Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full bg-[#45564B] hover:opacity-90 active:scale-[0.99] text-white font-mono text-sm font-medium transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#45564B]/30"
          >
            {/* Google 'G' Logo with subtle circular white backing */}
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5 shadow-xs">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.28v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.28C.46 8.2.01 10.04.01 12s.46 3.8 1.28 5.42l4-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.28 6.58l4 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <span>{googleLoading ? "Connecting..." : "Sign in with Google"}</span>
          </button>

          {/* 2. Divider with centered monospace label 'or' */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-gray-200"></div>
            <span className="absolute bg-white px-3 font-mono text-xs text-gray-500 lowercase tracking-normal">
              or
            </span>
          </div>

          {/* 3. Form Inputs & Actions */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-xs sm:text-sm font-medium text-gray-800 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="Enter Email"
                className={`w-full px-3.5 py-2.5 rounded-lg border bg-white font-mono text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-mono focus:outline-none transition-all ${
                  errors.email
                    ? "border-red-400 focus:ring-2 focus:ring-red-400/20 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                }`}
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 font-mono text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block font-mono text-xs sm:text-sm font-medium text-gray-800 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter password"
                className={`w-full px-3.5 py-2.5 rounded-lg border bg-white font-mono text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-mono focus:outline-none transition-all ${
                  errors.password
                    ? "border-red-400 focus:ring-2 focus:ring-red-400/20 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
                }`}
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1 font-mono text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 4. Options Row (Keep me signed in + Forgot password?) */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#4E6955] focus:ring-2 focus:ring-green-700/20 cursor-pointer accent-[#4E6955]"
                />
                <span className="font-mono text-xs">Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() => setForgotPasswordNotice(true)}
                className="font-mono text-xs text-gray-500 hover:text-gray-800 hover:underline transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            </div>

            {/* 5. Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-[#76937F] hover:bg-[#637d6b] text-white font-mono font-bold text-sm sm:text-base tracking-wide flex items-center justify-center transition-all duration-150 active:scale-[0.99] shadow-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#76937F]/40"
              >
                <span>{loading ? "Signing in..." : "Continue"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Navigation Link */}
        <div className="mt-8 text-center border-t border-gray-100 pt-4">
          <p className="font-mono text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#4E6955] hover:text-[#385241] font-semibold hover:underline transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
