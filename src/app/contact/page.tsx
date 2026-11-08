import type { Metadata } from "next";
import { ContactClient } from "./ContactClient";
import { siteName, siteDescription, sitePhonesFormatted, siteEmail } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact & Trip Planning",
  description:
    "Get in touch with Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন। Office at Savar Pollibidut, Dhaka. Plan your domestic tour with trusted local hosts across Bangladesh.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact & Trip Planning | ${siteName}`,
    description:
      "Plan your next journey across Bangladesh. Message our team directly on WhatsApp or submit a custom trip inquiry.",
    url: "https://savartourlover.com/contact",
    siteName,
    type: "website",
    images: [
      {
        url: "/images/logo-badge.png",
        width: 800,
        height: 800,
        alt: `${siteName} — Contact Us`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact & Trip Planning | ${siteName}`,
    description: siteDescription,
    images: ["/images/logo-badge.png"],
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": "https://savartourlover.com/contact#page",
      name: `Contact ${siteName}`,
      description: "Contact and trip planning page for Savar Tour Lover domestic travel agency.",
      url: "https://savartourlover.com/contact",
      mainEntity: {
        "@type": "TravelAgency",
        name: siteName,
        telephone: sitePhonesFormatted[0] || "+880 1620-592884",
        email: siteEmail,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Savar Pollibidut, Kobarsthan Road",
          addressLocality: "Savar",
          addressRegion: "Dhaka",
          postalCode: "1340",
          addressCountry: "BD",
        },
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://savartourlover.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: "https://savartourlover.com/contact",
        },
      ],
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <ContactClient />
    </>
  );
}
