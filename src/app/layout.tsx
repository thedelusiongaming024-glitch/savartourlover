import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts instead of next/font/google. This is a
// deliberate deployment-robustness change, not a style change — the
// font-face declarations (@fontsource-variable) are byte-identical
// subsets of the same two Google fonts (Fraunces 100-900, Plus Jakarta
// Sans 200-800), just bundled via npm instead of fetched from
// fonts.googleapis.com at build time. next/font/google requires network
// access to Google's servers during every `next build` — normal on most
// CI, but a real, recurring failure point on any restricted-network build
// environment (locked-down corporate CI, some self-hosted runners, this
// project's own sandboxed dev environment), and it makes the production
// build non-reproducible if Google's fonts CDN ever has an outage during
// a deploy. Self-hosting removes that dependency entirely, and as a
// side benefit avoids sending visitors' IPs to Google at page-load time.
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServerTracker } from "@/components/ServerTracker";
import {
  siteDescription,
  siteName,
  siteNameBn,
  siteTagline,
  siteEmail,
  sitePhonesFormatted,
  siteAddressEn,
} from "@/data/site";

import { getSeoSettings } from "@/server/db";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a4f3e",
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = getSeoSettings();
  const baseUrl = seo.canonical_base_url || "https://savartourlover.com";
  const ogImg = seo.default_og_image || "/images/logo-badge.png";
  const fullOgImg = ogImg.startsWith("http") ? ogImg : `${baseUrl}${ogImg.startsWith("/") ? "" : "/"}${ogImg}`;

  return {
    title: {
      default: seo.site_title || `${siteName} — ${siteTagline}`,
      template: seo.title_template || `%s | ${seo.business_name_en || siteName}`,
    },
    description: seo.meta_description || siteDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: "./",
    },
    keywords:
      seo.keywords && seo.keywords.length > 0
        ? seo.keywords
        : [
            "Savar Tour Lover",
            "সাভার ট্যুর লাভার",
            "Bangladesh tour packages",
            "Sajek tour package",
            "Cox's Bazar tour package",
            "Saint Martin package tour",
            "Sylhet tour package",
            "Sundarbans tour",
            "Sreemangal tea garden tour",
            "domestic tours Bangladesh",
            "cheap tour packages Bangladesh",
            "family tour package BD",
            "corporate tour Bangladesh",
          ],
    authors: [{ name: seo.business_name_en || siteName, url: baseUrl }],
    creator: seo.business_name_en || siteName,
    publisher: seo.business_name_en || siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    verification: {
      google: seo.google_site_verification ? seo.google_site_verification.trim() : undefined,
      other: {
        ...(seo.bing_site_verification ? { "msvalidate.01": seo.bing_site_verification.trim() } : {}),
        ...(seo.yandex_verification ? { "yandex-verification": seo.yandex_verification.trim() } : {}),
        ...(seo.baidu_verification ? { "baidu-site-verification": seo.baidu_verification.trim() } : {}),
      },
    },
    other: {
      "geo.region": seo.geo_region || "BD-13",
      "geo.placename": seo.geo_placename || "Savar, Dhaka, Bangladesh",
      "geo.position": `${seo.geo_latitude || "23.8583"};${seo.geo_longitude || "90.2667"}`,
      ICBM: `${seo.geo_latitude || "23.8583"}, ${seo.geo_longitude || "90.2667"}`,
    },
    robots: {
      index: seo.robots_index !== false,
      follow: seo.robots_follow !== false,
      googleBot: {
        index: seo.robots_index !== false,
        follow: seo.robots_follow !== false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: seo.site_title || `${siteName} — ${siteTagline}`,
      description: seo.meta_description || siteDescription,
      url: baseUrl,
      siteName: seo.business_name_en || siteName,
      locale: "en_US",
      alternateLocale: ["bn_BD"],
      type: "website",
      images: [
        {
          url: fullOgImg,
          width: 800,
          height: 800,
          alt: `${seo.business_name_en || siteName} — আপনার স্বপ্ন উড়তে দিন`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.site_title || `${siteName} — ${siteTagline}`,
      description: seo.meta_description || siteDescription,
      images: [fullOgImg],
      creator: seo.twitter_handle || "@savartourlover",
      site: seo.twitter_handle || "@savartourlover",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seo = getSeoSettings();
  const baseUrl = seo.canonical_base_url || "https://savartourlover.com";
  const logoUrl = `${baseUrl}/images/logo-badge.png`;

  const sameAsLinks = [
    seo.facebook_url,
    seo.instagram_url,
    seo.youtube_url,
    seo.tiktok_url,
  ].filter(Boolean) as string[];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${baseUrl}/#organization`,
    name: seo.business_name_en || siteName,
    alternateName: [seo.business_name_bn || siteNameBn, "Savar Tour Lover BD", "সাভার ট্যুর লাভার"],
    url: baseUrl,
    logo: logoUrl,
    image: logoUrl,
    description: seo.meta_description || siteDescription,
    telephone: seo.contact_phone || sitePhonesFormatted[0] || "+880 1620-592884",
    email: seo.contact_email || siteEmail,
    priceRange: seo.price_range || "৳৳",
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash, bKash, Nagad, Rocket, Credit Card, Bank Transfer",
    address: {
      "@type": "PostalAddress",
      streetAddress: seo.office_address_en || "Savar Pollibidut, Kobarsthan Road",
      addressLocality: "Savar",
      addressRegion: "Dhaka",
      postalCode: "1340",
      addressCountry: "BD",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: seo.geo_latitude || "23.8583",
      longitude: seo.geo_longitude || "90.2667",
    },
    areaServed: {
      "@type": "Country",
      name: "Bangladesh",
    },
    ...(sameAsLinks.length > 0 ? { sameAs: sameAsLinks } : {}),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: seo.business_name_en || siteName,
    alternateName: seo.business_name_bn || siteNameBn,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/tours?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased overflow-x-clip max-w-[100vw]"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem('tourlover_lang')||localStorage.getItem('atithi_lang')||(document.cookie.match(/(?:tourlover_lang|atithi_lang)=(en|bn)/)||[])[1];if(l==='bn'){document.documentElement.lang='bn';document.documentElement.classList.add('lang-bn');}}catch(_){};try{var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].attributeName==='cz-shortcut-listen'&&document.body){document.body.removeAttribute('cz-shortcut-listen');}}});o.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['cz-shortcut-listen']});}catch(_){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {seo.google_analytics_id && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${seo.google_analytics_id.trim()}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.google_analytics_id.trim()}');`,
              }}
            />
          </>
        )}
        {seo.facebook_pixel_id && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebook_pixel_id.trim()}');fbq('track','PageView');`,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col text-ink overflow-x-clip max-w-[100vw] selection:bg-emerald/20">
        <LanguageProvider>
          <ServerTracker />
          <Navbar />
          <main className="flex-1 w-full max-w-[100vw] overflow-x-clip">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
