import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
}

function getSupabaseAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
}

function getSupabaseServerKey(): string {
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  ).trim();

  if (serviceKey && !serviceKey.includes("sb_secret_4_SkpGbKbCTjxgdpfew82A_0D4x1FAI")) {
    return serviceKey;
  }

  // Fallback to anon/publishable key if secret key is not provided
  return getSupabaseAnonKey();
}

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;
let cachedAdminUrl: string = "";
let cachedAdminKey: string = "";

/**
 * Public browser-safe Supabase client
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (typeof window === "undefined") {
    return createClient(url || "http://127.0.0.1:9", key || "missing-key");
  }
  if (!browserClient) {
    browserClient = createClient(url, key);
  }
  return browserClient;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseServerKey();
  return Boolean(url && key && url.startsWith("http"));
}

/**
 * Server Supabase client with admin (service-role) privileges.
 * Bypasses Row Level Security (RLS) for durable database syncs across all serverless invocations.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServerKey();

  if (!url || !key) {
    console.error(
      "[Supabase] Neither SUPABASE_URL nor valid SUPABASE keys are configured in environment variables. Check deployment environment settings."
    );
    // Return dummy client without caching so when env becomes available, it works
    return createClient(url || "http://127.0.0.1:9", key || "supabase-not-configured", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (adminClient && cachedAdminUrl === url && cachedAdminKey === key) {
    return adminClient;
  }

  cachedAdminUrl = url;
  cachedAdminKey = key;
  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}
