import type { NextConfig } from "next";

// Derive the Supabase Storage hostname from the configured project URL instead
// of hard-coding it, so this works across environments without allowing "**".
function supabaseHostname(): string | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  outputFileTracingIncludes: {
    "/*": ["./.data/**/*", "./data_storage/**/*"],
    "/api/**/*": ["./.data/**/*", "./data_storage/**/*"],
  },
  images: {
    qualities: [75, 82],
    // Only the specific hosts this app actually serves images from are allowed.
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/destination",
        destination: "/destinations",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
