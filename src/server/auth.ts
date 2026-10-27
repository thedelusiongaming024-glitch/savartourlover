import crypto from "node:crypto";
import type { DbStaffUser, StaffRole } from "./types";

/**
 * Secrets are resolved lazily (not at import time) so `next build` does not
 * need them, but every sign/verify call fails closed in production if the
 * environment variable is missing. The dev-only fallback below must never be
 * used to protect real data.
 */
const DEV_JWT_SECRET = "dev-only-jwt-secret-do-not-use-in-production";

function getJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (value) {
    if (process.env.NODE_ENV === "production" && value.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    return value;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production.");
  }
  return DEV_JWT_SECRET;
}

const STAFF_ROLES: readonly StaffRole[] = [
  "super_admin",
  "finance_manager",
  "operations_staff",
  "sales_manager",
  "tour_host",
];

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

const ACCESS_TOKEN_EXPIRY_SECONDS = 12 * 60 * 60; // 12 hours
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface JwtPayload {
  user_id: string;
  username: string;
  role: StaffRole;
  phone_number: string | null;
  token_type: "access" | "refresh";
  exp: number;
  iat: number;
  [key: string]: unknown;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

export function verifyJwt<T = JwtPayload>(token: string, secret: string = getJwtSecret()): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (!safeEqual(signature, expectedSignature)) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    // Every token we issue carries an expiry; a token without one is never valid.
    if (typeof payload.exp !== "number" || payload.exp < now) {
      return null;
    }

    return payload as unknown as T;
  } catch {
    return null;
  }
}

// OWASP-recommended minimum for PBKDF2-HMAC-SHA512 (2023 guidance). The old
// value (10,000) is far below current guidance and makes offline brute-force
// of a leaked hash+salt cheap.
const PBKDF2_ITERATIONS = 210000;
// Iterations used by any hash that predates this change and therefore has no
// "iterations$hash" prefix. Needed only so existing stored hashes still verify.
const LEGACY_PBKDF2_ITERATIONS = 10000;

function pbkdf2Hex(password: string, salt: string, iterations: number): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
}

// Stored format is "<iterations>$<hex hash>" so the iteration count can be
// raised again later without invalidating every existing password, and so a
// user's hash is transparently upgraded to the new iteration count the next
// time they log in successfully (see verifyPassword).
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = `${PBKDF2_ITERATIONS}$${pbkdf2Hex(password, s, PBKDF2_ITERATIONS)}`;
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const separatorIndex = hash.indexOf("$");
  const iterations = separatorIndex === -1 ? LEGACY_PBKDF2_ITERATIONS : Number(hash.slice(0, separatorIndex));
  const storedDigest = separatorIndex === -1 ? hash : hash.slice(separatorIndex + 1);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const computed = pbkdf2Hex(password, salt, iterations);
  return safeEqual(computed, storedDigest);
}

// True when a hash that just verified successfully was produced with an
// iteration count below the current standard, so the caller can re-hash and
// persist the upgraded value (lazy migration — we never have the plaintext
// password outside of a successful login, so this is the only safe time).
export function needsRehash(hash: string): boolean {
  const separatorIndex = hash.indexOf("$");
  const iterations = separatorIndex === -1 ? LEGACY_PBKDF2_ITERATIONS : Number(hash.slice(0, separatorIndex));
  return !Number.isInteger(iterations) || iterations < PBKDF2_ITERATIONS;
}

export function generateTokens(user: DbStaffUser): { access: string; refresh: string } {
  const now = Math.floor(Date.now() / 1000);

  const accessPayload: JwtPayload = {
    user_id: user.id,
    username: user.username,
    role: user.role,
    phone_number: user.phone_number,
    token_type: "access",
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
  };

  const refreshPayload: JwtPayload = {
    user_id: user.id,
    username: user.username,
    role: user.role,
    phone_number: user.phone_number,
    token_type: "refresh",
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
  };

  const secret = getJwtSecret();
  return {
    access: signJwt(accessPayload, secret),
    refresh: signJwt(refreshPayload, secret),
  };
}

export function getAuthUserFromHeader(authHeader: string | null): JwtPayload | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  const payload = verifyJwt<JwtPayload>(token);
  if (!payload || payload.token_type !== "access") return null;
  // Customer tokens are signed with the same key and also carry token_type
  // "access". Without this check any customer could call staff endpoints.
  if (typeof payload.user_id !== "string" || !STAFF_ROLES.includes(payload.role)) return null;
  return payload;
}

export interface CustomerJwtPayload {
  customer_id: string;
  phone_number: string;
  full_name: string;
  email?: string;
  role: "customer";
  token_type: "access";
  exp: number;
  iat: number;
}

const CUSTOMER_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function generateCustomerToken(customer: { id: string; phone_number: string; full_name: string; email?: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: CustomerJwtPayload = {
    customer_id: customer.id,
    phone_number: customer.phone_number,
    full_name: customer.full_name,
    email: customer.email,
    role: "customer",
    token_type: "access",
    iat: now,
    exp: now + CUSTOMER_TOKEN_EXPIRY_SECONDS,
  };
  return signJwt(payload as unknown as Record<string, unknown>, getJwtSecret());
}

export function getCustomerFromHeader(authHeader: string | null): CustomerJwtPayload | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  return parseCustomerToken(token);
}

function parseCustomerToken(token: string): CustomerJwtPayload | null {
  const payload = verifyJwt<CustomerJwtPayload>(token);
  if (!payload || payload.role !== "customer" || payload.token_type !== "access") return null;
  if (typeof payload.customer_id !== "string" || !payload.customer_id) return null;
  return payload;
}

/** Resolves the signed-in customer from the Authorization header or the session cookie. */
export function getCustomerFromRequest(request: Request): CustomerJwtPayload | null {
  const fromHeader = getCustomerFromHeader(request.headers.get("authorization"));
  if (fromHeader) return fromHeader;

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)(?:tourlover_customer_token|atithi_customer_token)=([^;]+)/);
  if (!match) return null;
  try {
    return parseCustomerToken(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/**
 * Cookie attributes for the customer session cookie (Secure in production).
 *
 * `httpOnly: true` so the session token cannot be read by JavaScript — any
 * XSS on the site can no longer exfiltrate it via `document.cookie`. The
 * client never needs to read this cookie back (it's only ever consumed
 * server-side by `getCustomerFromRequest`), so this is a pure hardening
 * with no functional loss.
 */
export function customerCookieOptions() {
  return {
    path: "/",
    maxAge: CUSTOMER_TOKEN_EXPIRY_SECONDS,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

/** Attributes to clear the customer session cookie (used on logout). */
export function clearedCustomerCookieOptions() {
  return {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

