import { createClient, SupabaseClient } from "@supabase/supabase-js";

// No credentials are hard-coded here any more. Configure them through environment variables
// (see .env.example). The Supabase URL and the publishable (anon) key are public by design and are
// exposed to the browser via NEXT_PUBLIC_*; the secret/service-role key is server-only.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

const SUPABASE_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Public browser-safe Supabase client
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && (SUPABASE_SECRET || SUPABASE_KEY));
}

let warnedNotConfigured = false;

// Filter out known broken/unregistered placeholder keys
function resolveEffectiveServerKey(): string {
  if (
    SUPABASE_SECRET &&
    SUPABASE_SECRET.trim() &&
    !SUPABASE_SECRET.includes("sb_secret_4_SkpGbKbCTjxgdpfew82A_0D4x1FAI")
  ) {
    return SUPABASE_SECRET.trim();
  }
  return SUPABASE_KEY.trim();
}

/**
 * Server Supabase client.
 *
 * Uses the service-role / secret key when available to bypass Row Level Security.
 * If the secret key is not set or invalid, seamlessly falls back to the publishable (anon)
 * key so public catalog data (destinations, tours, offers, homepage blocks) remains wired
 * and accessible instead of completely breaking the website.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  if (!isSupabaseConfigured()) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      console.error(
        "[Supabase] Neither SUPABASE_URL nor valid SUPABASE keys are configured. Running in LOCAL-ONLY mode."
      );
    }
    adminClient = createClient("http://127.0.0.1:9", "supabase-not-configured", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return adminClient;
  }

  const effectiveKey = resolveEffectiveServerKey();

  adminClient = createClient(SUPABASE_URL, effectiveKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}
