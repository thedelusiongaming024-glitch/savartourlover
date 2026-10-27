import type { Review, Service, Offer } from "@/lib/types";

export const siteName = "Savar Tour Lover";
export const siteNameBn = "সাভার ট্যুর লাভার";
export const siteTagline = "আপনার স্বপ্ন উড়তে দিন — Let Your Dreams Fly";
export const siteTaglineBn = "আপনার স্বপ্ন উড়তে দিন";
export const siteDescription =
  "সাভার ট্যুর লাভার (Savar Tour Lover) — আপনার স্বপ্ন উড়তে দিন। Curated domestic tours across Bangladesh with trusted local hosts, transparent pricing, and seamless booking.";

export const sitePhones = ["01620592884", "01646325350"];
export const sitePhonesFormatted = ["+880 1620-592884", "+880 1646-325350"];
export const siteAddressEn = "Savar Pollibidut, Kobarsthan Road, Savar, Dhaka, 1340, Bangladesh";
export const siteAddressBn = "সাভার পল্লীবিদ্যুৎ, কবরস্থান রোড, সাভার, ঢাকা, ১৩৪০, বাংলাদেশ";
export const siteEmail = "savartourlover@gmail.com";

export const heroStats: { value: string; label: string }[] = [];

export const whyUs: { title: string; description: string; icon: string }[] = [
  {
    title: "Trusted local hosts",
    description:
      "Every tour is led by a verified Bangladeshi host who knows their district like family — not a scripted guide.",
    icon: "users",
  },
  {
    title: "Transparent pricing",
    description:
      "The price you see is the price you pay. No hidden fees, no last-minute 'fuel surcharges', no surprises.",
    icon: "receipt",
  },
  {
    title: "Flexible payment",
    description:
      "Book with a 40% advance and clear the balance on tour day — online or directly with your host, with confirmation to both sides.",
    icon: "receipt",
  },
  {
    title: "Zero-friction booking",
    description:
      "From browsing to e-ticket in minutes. Your voucher, digital ticket, and reminders arrive automatically on WhatsApp and email.",
    icon: "ticket",
  },
  {
    title: "Real 24/7 support",
    description:
      "A human answers on WhatsApp throughout your trip — not a chatbot that loops you in circles.",
    icon: "support",
  },
  {
    title: "Money, fully accounted",
    description:
      "Every payment is tracked end-to-end and confirmed to you and our team, so there's never a dispute about what was paid.",
    icon: "shield",
  },
];

export const services: Service[] = [
  {
    title: "Group Tours",
    description:
      "Curated group departures to every corner of Bangladesh, led by a local host and priced all-inclusive.",
    icon: "users",
  },
  {
    title: "Private & Custom Trips",
    description:
      "Your dates, your pace, your budget. We design a private itinerary around exactly what you want to do.",
    icon: "route",
  },
  {
    title: "Honeymoon Packages",
    description:
      "Ocean-view suites, candlelit dinners, and private moments — built for two, from arrival flowers to departure.",
    icon: "heart",
  },
  {
    title: "Family Holidays",
    description:
      "Kids-first pacing, safe transport, and hosts who handle the logistics so parents actually relax.",
    icon: "home",
  },
  {
    title: "Corporate Retreats",
    description:
      "Team trips to the hills or the coast with planning, logistics, and bonding activities handled end to end.",
    icon: "briefcase",
  },
  {
    title: "Adventure & Trekking",
    description:
      "Hill-tract treks, forest cruises, and off-the-map experiences with certified local guides and permits arranged.",
    icon: "mountain",
  },
];

export const specialOffers: Offer[] = [];

export const reviews: Review[] = [];

export const destinationsForHome: { slug: string; label: string }[] = [];
