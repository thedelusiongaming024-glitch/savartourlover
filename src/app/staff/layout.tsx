import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a4f3e",
};

export const metadata: Metadata = {
  title: "Admin Portal | Savar Tour Lover",
  description: "Savar Tour Lover Staff & Management Portal — Back-office operations, bookings, finance, and clearances.",
  manifest: "/admin.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STL Admin",
  },
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
