import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/server/db";

export default function robots(): MetadataRoute.Robots {
  const seo = getSeoSettings();
  const baseUrl = (seo.canonical_base_url || "https://savartourlover.com").replace(/\/+$/, "");

  const allowAll = seo.robots_index !== false;

  return {
    rules: [
      {
        userAgent: "*",
        allow: allowAll ? "/" : undefined,
        disallow: allowAll
          ? [
              "/staff",
              "/staff/*",
              "/api/*",
              "/profile",
              "/profile/*",
              "/payment-result",
            ]
          : ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
