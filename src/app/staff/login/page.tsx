"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { staffLogin } from "@/lib/staffAuth";
import { AdminInstallAppButton } from "@/components/AdminInstallAppButton";

// Only ever redirect to a known, internal staff route after login. The
// `next` query param previously passed straight to router.push() with no
// validation — an attacker could send a staff member a link like
// /staff/login?next=https://evil.example and land them on an external
// site immediately after they authenticate. Restricting to an allowlist
// of real internal destinations closes that off entirely rather than
// trying to pattern-match "looks like a relative path" (which is easy to
// get wrong, e.g. protocol-relative "//evil.example").
const ALLOWED_NEXT_PATHS = new Set(["/staff/dashboard", "/staff/admin"]);
const DEFAULT_NEXT_PATH = "/staff/dashboard";

function resolveNextPath(raw: string | null): string {
  if (raw && ALLOWED_NEXT_PATHS.has(raw)) return raw;
  return DEFAULT_NEXT_PATH;
}

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNextPath(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await staffLogin(username, password);
    setLoading(false);
    if (result.ok) {
      router.push(next);
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-emerald-200 p-1 shadow-xs mb-3">
            <img src="/images/logo-badge.png" alt="Savar Tour Lover" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Savar Tour Lover</h1>
          <p className="text-xs font-semibold text-emerald-700">আপনার স্বপ্ন উড়তে দিন</p>
          <p className="mt-1 text-xs text-slate-500">Back-office and management access</p>
        </div>

        <label className="mt-6 flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Username
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
            autoComplete="username"
            placeholder="admin or ops username"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Password
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2 text-slate-900 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-emerald-700 transition cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Authenticating…" : "Sign In to Back Office"}
        </button>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <AdminInstallAppButton variant="login" />
        </div>
      </form>
    </main>
  );
}

export default function StaffLoginPage() {
  // useSearchParams requires a Suspense boundary in a Client Component on
  // an otherwise-static route — without one, `next build` fails even
  // though `tsc --noEmit` passes clean (this is a build-time/runtime
  // requirement, not a type error, so type-checking alone never caught
  // it).
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}
