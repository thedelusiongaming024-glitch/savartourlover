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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a4f3e",
};

export const metadata: Metadata = {
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s — ${siteName}`,
  },
  description: siteDescription,
  metadataBase: new URL("https://savartourlover.com"),
  alternates: {
    canonical: "./",
  },
  keywords: [
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
  authors: [{ name: siteName, url: "https://savartourlover.com" }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    url: "https://savartourlover.com",
    siteName: siteName,
    locale: "en_US",
    alternateLocale: ["bn_BD"],
    type: "website",
    images: [
      {
        url: "/images/logo-badge.png",
        width: 800,
        height: 800,
        alt: `${siteName} — আপনার স্বপ্ন উড়তে দিন`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: siteDescription,
    images: ["/images/logo-badge.png"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "@id": "https://savartourlover.com/#organization",
  name: siteName,
  alternateName: siteNameBn,
  url: "https://savartourlover.com",
  logo: "https://savartourlover.com/images/logo-badge.png",
  image: "https://savartourlover.com/images/logo-badge.png",
  description: siteDescription,
  telephone: sitePhonesFormatted[0] || "+880 1620-592884",
  email: siteEmail,
  priceRange: "৳৳",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Savar Pollibidut, Kobarsthan Road",
    addressLocality: "Savar",
    addressRegion: "Dhaka",
    postalCode: "1340",
    addressCountry: "BD",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "23.8583",
    longitude: "90.2667",
  },
  areaServed: {
    "@type": "Country",
    name: "Bangladesh",
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
