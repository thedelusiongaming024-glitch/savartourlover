"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
const TOKEN_KEY = "tourlover_staff_access_token";
const REFRESH_KEY = "tourlover_staff_refresh_token";
const USER_KEY = "tourlover_staff_user";

export interface StaffUser {
  id: string;
  username: string;
  role: string;
  phone_number: string | null;
}

/**
 * Decodes a JWT payload. JWTs are base64URL-encoded (using "-" and "_",
 * no padding) — plain `atob` expects standard base64 ("+" and "/", with
 * "=" padding) and throws `InvalidCharacterError` the moment a token
 * happens to contain a "-" or "_" byte, which is common, not rare. That
 * previously had no try/catch around it at all, so a login could throw
 * uncaught and leave the page's loading state stuck forever with no
 * error shown. Returns null (never throws) on any malformed input.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function saveStaffSession(access: string, refresh: string, user: StaffUser) {
  sessionStorage.setItem(TOKEN_KEY, access);
  sessionStorage.setItem(REFRESH_KEY, refresh);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStaffToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem("atithi_staff_access_token");
}

function getStaffRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_KEY) || sessionStorage.getItem("atithi_staff_refresh_token");
}

export function getStaffUser(): StaffUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY) || sessionStorage.getItem("atithi_staff_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function clearStaffSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem("atithi_staff_access_token");
  sessionStorage.removeItem("atithi_staff_refresh_token");
  sessionStorage.removeItem("atithi_staff_user");
}

/**
 * Exchanges the stored refresh token for a new access token via
 * /auth/token/refresh/ (already implemented on the backend — it just had
 * no caller). Returns the new access token on success, or null if the
 * refresh token is missing/expired/invalid, in which case the caller
 * should treat the session as ended.
 */
async function refreshStaffAccessToken(): Promise<string | null> {
  const refresh = getStaffRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access) return null;

    sessionStorage.setItem(TOKEN_KEY, data.access);
    // SIMPLE_JWT.ROTATE_REFRESH_TOKENS is on server-side, so a rotated
    // refresh token comes back too — persist it if present, otherwise
    // keep the one we already have.
    if (data.refresh) sessionStorage.setItem(REFRESH_KEY, data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch against the Django API using the staff JWT.
 *
 * Previously this attached whatever access token happened to be in
 * sessionStorage and stopped there — no refresh, no 401 handling. Since
 * the access token lifetime is 12h, any staff member with the app open
 * across that boundary got silent failures (every request quietly
 * unauthorized) instead of either a working session or a clear
 * "logged out, please sign in again."
 *
 * Now: on a 401, try exactly one refresh-and-retry before giving up. If
 * the refresh itself fails (refresh token also expired/invalid), the
 * session is cleared so the caller's own "no user -> redirect to login"
 * check fires cleanly instead of leaving a half-valid session around.
 */
export async function staffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Normalize trailing slash to match Next.js App Router route conventions without 308 redirects
  const cleanPath = path.includes("?")
    ? path.replace(/\/+\?/, "?")
    : path.replace(/\/+$/, "");

  const doFetch = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(`${API_BASE}${cleanPath}`, { ...init, headers });
  };

  const token = getStaffToken();
  const res = await doFetch(token);

  if (res.status !== 401) return res;

  const refreshedToken = await refreshStaffAccessToken();
  if (!refreshedToken) {
    clearStaffSession();
    return res;
  }
  return doFetch(refreshedToken);
}

export async function staffLogin(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${API_BASE}/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    return { ok: false, error: "Invalid username or password." };
  }
  const data = await res.json();

  // The access token payload carries `role`; decode without a JWT library
  // since we only need the two custom claims we set in
  // TokenObtainPairSerializer. decodeJwtPayload never throws.
  const payload = decodeJwtPayload(data.access);
  if (!payload || typeof payload.user_id !== "string" || typeof payload.role !== "string") {
    return { ok: false, error: "Received an unexpected response from the server. Please try again." };
  }

  saveStaffSession(data.access, data.refresh, {
    id: payload.user_id,
    username,
    role: payload.role,
    phone_number: (payload.phone_number as string | null) ?? null,
  });
  return { ok: true };
}
