"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { staffLogin } from "@/lib/staffAuth";

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
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "Authenticating…" : "Sign In to Back Office"}
        </button>
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
