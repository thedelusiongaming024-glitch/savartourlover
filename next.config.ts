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
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    qualities: [75, 82],
    // Previously "**" (any host, http or https), which lets anyone embed
    // arbitrary/attacker-controlled remote images through the Next.js image
    // optimizer (SSRF / cache-abuse risk). Only the specific hosts this app
    // actually serves images from are allowed now.
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
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
