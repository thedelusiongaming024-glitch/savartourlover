"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearStaffSession, getStaffUser, staffFetch, type StaffUser } from "@/lib/staffAuth";
import { normalizeImageUrl, normalizeVideoUrl } from "@/lib/media";
import { getBanglaWatermark } from "@/lib/banglaNames";
import { useLanguage } from "@/context/LanguageContext";
import { toBengaliNumber } from "@/lib/translations";
import { adminI18n, type AdminLang } from "@/lib/adminI18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import type {
  DbTour,
  DbDeparture,
  DbTourGalleryItem,
  DbDestination,
  DbBlogPost,
  DbOffer,
  DbTestimonial,
  DbBooking,
  DbContactInquiry,
  DbHomepageBlock,
  DbCustomerUser,
  AboutPageCmsContent,
  JournalPageCmsContent,
  AboutValueItem,
  AboutTeamMember,
  HomePageCmsContent,
  HeroSlideItem,
  WhyUsItem,
  ServiceItem,
  DbTourCategory,
} from "@/server/types";

export interface CustomerWithDetails extends DbCustomerUser {
  bookings_count: number;
  total_spent: number;
  total_due: number;
  bookings: DbBooking[];
}

interface AgencyOverview {
  total_revenue: string;
  total_direct_cost: string;
  total_operational_expense: string;
  gross_profit: string;
  net_profit: string;
  bookings_count: number;
  active_tours_count: number;
  pending_advances: string;
  due_on_tour_day: string;
  supplier_payables: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  is_acknowledged: boolean;
  created_at: string;
}

import { TourReportManager } from "@/components/TourReportManager";
import { AdminSeoManager } from "@/components/AdminSeoManager";

type ActiveTab =
  | "overview"
  | "tours"
  | "destinations"
  | "users"
  | "cms"
  | "about_cms"
  | "blog"
  | "offers"
  | "reviews"
  | "bookings"
  | "reports"
  | "inquiries"
  | "seo";

const DEFAULT_ABOUT_PAGE_CMS: AboutPageCmsContent = {
  hero_eyebrow: "About Savar Tour Lover",
  hero_title: "Thoughtful journeys across Bangladesh",
  hero_subtitle:
    "Built by local travelers who believe the best trips happen when you're hosted like family, not processed like a transaction.",
  story_badge: "Our Story",
  story_title: "Born out of a simple conviction",
  story_paragraphs: [
    "Most domestic travel in Bangladesh was broken in two ways: either you were on your own navigating erratic transport, unverified hotels, and hidden costs — or you were packed into a thirty-person bus tour with fixed buffets and thirty-minute photo stops.",
    "We wanted something different: trips designed the way an experienced friend would show you their hometown. Small groups, handpicked local hosts, honest pricing, and genuine hospitality.",
    "Today, Savar Tour Lover runs curated journeys to twelve destinations across Bangladesh — from the tea valleys of Sreemangal to the coral reefs of Saint Martin. Every trip is led by someone who actually lives there.",
  ],
  mission_title: "Our Mission",
  mission_text:
    "To make domestic travel across Bangladesh seamless, transparent, and genuinely memorable — while ensuring tourism directly benefits the local communities and guides who make these places special.",
  values: [
    {
      icon: "shield",
      title: "Radical transparency",
      description:
        "No hidden resort fees, surprise fuel charges, or mandatory tips. Every BDT is accounted for upfront.",
    },
    {
      icon: "users",
      title: "Local, always",
      description:
        "No outsourced guides, no foreign templates. Every host is Bangladeshi, and every itinerary is built around real local knowledge.",
    },
    {
      icon: "heart",
      title: "Hospitality first",
      description:
        'At Savar Tour Lover, guest hospitality is central to our culture. We host you the way we\'d host family, not process you like a booking number.',
    },
    {
      icon: "sparkle",
      title: "Considered detail",
      description:
        "From the ridge walk only locals know to the candlelit dinner arranged without being asked — the small things are the trip.",
    },
  ],
  booking_eyebrow: "How booking works",
  booking_title: "Zero-friction, start to finish",
  booking_description:
    "From your first search to your final confirmed payment, every step is designed to remove friction and ambiguity.",
  team_eyebrow: "The team",
  team_title: "A few of the people who'll host you",
  team: [
    {
      name: "Raisa Chowdhury",
      role: "Co-founder & Head of Experience",
      bio: "Ten years guiding across the Chittagong Hill Tracts before building Savar Tour Lover's tour design team.",
      scene: "sajek",
    },
    {
      name: "Tanvir Hasan",
      role: "Co-founder & Head of Operations",
      bio: "Runs the host network and on-ground logistics across all twelve destinations.",
      scene: "sundarbans",
    },
    {
      name: "Mehedi Hasan",
      role: "Head of Finance",
      bio: "Built the secure payment and booking system so every advance and balance is tracked without ambiguity.",
      scene: "coxsbazar",
    },
  ],
  payment_badge: "Payment & Confirmation",
  payment_title: "How your money is handled, end to end",
  payment_description:
    "Pay in full or pay a small advance through bKash, Nagad, Rocket, or card at booking. If you paid partially, the remaining balance is settled on the day of the tour — either online or in cash directly with your host. The moment it clears, both you and our team get a WhatsApp and email confirmation, so there's a clean record of what was paid, when, on both sides.",
  payment_cta_label: "Talk to us",
  payment_cta_href: "/contact",
  cta_title: "Ready to plan your own story?",
  cta_description:
    "Tell us where you want to go — we'll take it from there, right through to your final confirmed payment.",
  cta_label: "Plan My Trip",
  cta_href: "/contact",
};

const DEFAULT_JOURNAL_PAGE_CMS: JournalPageCmsContent = {
  header_eyebrow: "Travel Journal",
  header_title: "Stories from the road",
  header_description:
    "Field guides, food trails, and honest travel writing from our hosts and guests across Bangladesh.",
  featured_badge: "Latest story",
  empty_title: "No articles published yet",
  empty_description:
    "Stories, packing guides, and field notes will appear here once written and published from the Super Admin Panel.",
};

const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [
  {
    id: "slide-coxsbazar",
    title: "Cox's Bazar",
    subtitle: "World's Longest Natural Sea Beach",
    image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "slide-sajek",
    title: "Sajek Valley",
    subtitle: "Valley of Clouds & Green Hills",
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "slide-sundarbans",
    title: "Sundarbans",
    subtitle: "World's Largest Mangrove Kingdom",
    image_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "slide-sylhet",
    title: "Sylhet & Sreemangal",
    subtitle: "Lush Rolling Tea Gardens & Waterfalls",
    image_url: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1920&q=80",
  },
  {
    id: "slide-stmartins",
    title: "Saint Martin's Island",
    subtitle: "Pristine Coral Island & Turquoise Sea",
    image_url: "https://images.unsplash.com/photo-1519046904884-53103b34b271?auto=format&fit=crop&w=1920&q=80",
  },
];

const DEFAULT_HOME_PAGE_CMS: HomePageCmsContent = {
  hero_media_type: "slideshow",
  hero_video_url: "",
  hero_slides: DEFAULT_HERO_SLIDES,
  hero_eyebrow: "Domestic tours across Bangladesh",
  hero_headline: "Discover Bangladesh,",
  hero_highlight: "your way",
  hero_subheadline: "Curated domestic tours. Trusted local hosts. Book with an advance and clear the balance on tour day.",
  hero_primary_cta_label: "Explore Tours",
  hero_primary_cta_href: "/tours",
  hero_secondary_cta_label: "Plan My Trip",
  hero_secondary_cta_href: "/contact",

  destinations_eyebrow: "Destinations",
  destinations_title: "Popular destinations across Bangladesh",
  destinations_description: "Beaches, hill tracts, mangrove forests, and tea country — pick a place, we'll handle the rest.",
  destinations_cta_label: "All destinations",
  destinations_cta_href: "/destinations",
  destinations_hidden: false,

  tours_eyebrow: "Tour Packages",
  tours_title: "Popular tour packages",
  tours_description: "Small groups, local hosts, and everything included. Filter by place, duration, or price to find your trip in seconds.",
  tours_cta_label: "Browse all tours",
  tours_cta_href: "/tours",
  tours_hidden: false,

  why_us_eyebrow: "Why Savar Tour Lover",
  why_us_title: "Travel with people who call Bangladesh home",
  why_us_description: "We're not a booking platform that outsources your trip to strangers. We're local hosts who plan, accompany, and settle every detail — including your final payment, confirmed on both sides.",
  why_us_items: [
    {
      title: "Trusted local hosts",
      description: "Every tour is led by a verified Bangladeshi host who knows their district like family — not a scripted guide.",
      icon: "users",
    },
    {
      title: "Transparent pricing",
      description: "The price you see is the price you pay. No hidden fees, no last-minute 'fuel surcharges', no surprises.",
      icon: "receipt",
    },
    {
      title: "Flexible payment",
      description: "Book with a 40% advance and clear the balance on tour day — online or directly with your host, with confirmation to both sides.",
      icon: "receipt",
    },
    {
      title: "Zero-friction booking",
      description: "From browsing to e-ticket in minutes. Your voucher, digital ticket, and reminders arrive automatically on WhatsApp and email.",
      icon: "ticket",
    },
    {
      title: "Real 24/7 support",
      description: "A human answers on WhatsApp throughout your trip — not a chatbot that loops you in circles.",
      icon: "support",
    },
    {
      title: "Money, fully accounted",
      description: "Every payment is tracked end-to-end and confirmed to you and our team, so there's never a dispute about what was paid.",
      icon: "shield",
    },
  ],
  why_us_hidden: false,

  services_eyebrow: "Services",
  services_title: "Every kind of trip, handled",
  services_description: "Group or private, family or honeymoon, weekend or expedition — if it's in Bangladesh, we'll host it.",
  services_items: [
    {
      title: "Group Tours",
      description: "Curated group departures to every corner of Bangladesh, led by a local host and priced all-inclusive.",
      icon: "users",
    },
    {
      title: "Private & Custom Trips",
      description: "Your dates, your pace, your budget. We design a private itinerary around exactly what you want to do.",
      icon: "route",
    },
    {
      title: "Honeymoon Packages",
      description: "Ocean-view suites, candlelit dinners, and private moments — built for two, from arrival flowers to departure.",
      icon: "heart",
    },
    {
      title: "Family Holidays",
      description: "Kids-first pacing, safe transport, and hosts who handle the logistics so parents actually relax.",
      icon: "home",
    },
    {
      title: "Corporate Retreats",
      description: "Team trips to the hills or the coast with planning, logistics, and bonding activities handled end to end.",
      icon: "briefcase",
    },
    {
      title: "Adventure & Trekking",
      description: "Hill-tract treks, forest cruises, and off-the-map experiences with certified local guides and permits arranged.",
      icon: "mountain",
    },
  ],
  services_hidden: false,

  offers_eyebrow: "Special Offers",
  offers_title: "A little reason to book today",
  offers_description: "Seasonal savings and group perks — applied automatically at checkout with the right code.",
  offers_hidden: false,

  reviews_eyebrow: "Customer Reviews",
  reviews_title: "Loved by travelers across Bangladesh",
  reviews_description: "Real words from guests who booked, travelled, and settled their balances — all in one seamless flow.",
  reviews_hidden: false,

  journal_eyebrow: "Travel Journal",
  journal_title: "Stories from the road",
  journal_description: "Field guides, food trails, and honest travel writing from our hosts and guests.",
  journal_cta_label: "All stories",
  journal_cta_href: "/journal",
  journal_hidden: false,

  cta_eyebrow: "Savar Tour Lover — Let Your Dreams Fly",
  cta_title: "Plan your next journey across Bangladesh",
  cta_description: "Tell us where you want to go and when — we'll design a tour around you. Book with a small advance and settle the rest on tour day.",
  cta_primary_label: "Plan My Trip",
  cta_primary_href: "/contact",
  cta_secondary_label: "Browse Tours",
  cta_secondary_href: "/tours",
  cta_hidden: false,
};

function formatBDT(amount: string | number, isBn?: boolean): string {
  const formatted = Math.round(Number(amount)).toLocaleString("en-BD");
  return isBn ? "৳" + toBengaliNumber(formatted) : "৳" + formatted;
}

function formatBookingDepartureDate(dateStr?: string): string {
  if (!dateStr) return "Open Date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const SEVERITY_BADGES: Record<Alert["severity"], string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

function AdminCashCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt?: string;
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const s = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(s);
      if (s <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (!expiresAt) return null;

  const isExpired = timeLeft <= 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-rose-100 border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-700">
        ⚠️ 10m Window Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-900 animate-pulse">
      ⏳ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")} remaining
    </span>
  );
}

function AdminRocketCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt?: string;
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const s = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(s);
      if (s <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (!expiresAt) return null;

  const isExpired = timeLeft <= 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-rose-100 border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-700">
        ⚠️ 15m Window Expired (Seats Releasing)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-purple-100 border border-purple-300 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-900 animate-pulse">
      ⏳ 15m Hold: {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")} remaining
    </span>
  );
}

function ImageUrlInput({
  label = "Cover Image URL",
  name,
  defaultValue = "",
  placeholder = "Google Drive link or any custom image URL (https://...)",
  helperText = "Supports Google Drive share links ('Anyone with link can view'), Dropbox, or any direct image URL.",
  required = false,
}: {
  label?: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}) {
  const [val, setVal] = useState(defaultValue);
  const [loadError, setLoadError] = useState(false);
  const normalized = normalizeImageUrl(val);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
        <span>{label} {required && <span className="text-rose-500">*</span>}</span>
        <input
          name={name}
          value={val}
          required={required}
          onChange={(e) => {
            setVal(e.target.value);
            setLoadError(false);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
          placeholder={placeholder}
        />
      </label>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{helperText}</span>
      </div>
      {normalized && !loadError && (
        <div className="mt-1 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized}
            alt="Preview"
            onError={() => setLoadError(true)}
            className="h-14 w-20 rounded-md object-cover border border-slate-300 shadow-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
              <span>✓ Image preview ready</span>
              {val.includes("drive.google.com") && (
                <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-800 font-medium">Google Drive link</span>
              )}
            </div>
            <div className="truncate text-[11px] text-slate-500">{normalized}</div>
          </div>
        </div>
      )}
      {normalized && loadError && (
        <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
          ⚠️ Could not load image preview. If using a Google Drive link, please ensure sharing is set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong>.
        </div>
      )}
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 text-slate-600 flex items-center justify-center text-sm font-medium">Loading control center…</div>}>
      <StaffDashboardContent />
    </Suspense>
  );
}

function StaffDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveTab) || "overview";

  const { language, setLanguage, toggleLanguage, isBn } = useLanguage();
  const dict = adminI18n[language as AdminLang] || adminI18n.en;
  const num = (v: number | string) => (isBn ? toBengaliNumber(v) : String(v));
  const bdt = (amount: string | number) => formatBDT(amount, isBn);

  const [user, setUser] = useState<StaffUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabScrollRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      tabScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Overview data
  const [overview, setOverview] = useState<AgencyOverview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trackingData, setTrackingData] = useState<{
    stats?: {
      totalEvents: number;
      totalPageViews: number;
      pageViews24h: number;
      uniqueSessions: number;
      uniqueVisitors: number;
      eventCounts: Record<string, number>;
      topPages: { path: string; count: number }[];
      topSources: { source: string; count: number }[];
    };
    recent?: any[];
  } | null>(null);

  // CRUD Data states
  const [tours, setTours] = useState<DbTour[]>([]);
  const [tourCategories, setTourCategories] = useState<(DbTourCategory & { tour_count?: number })[]>([]);
  const [destinations, setDestinations] = useState<DbDestination[]>([]);
  const [blogPosts, setBlogPosts] = useState<DbBlogPost[]>([]);
  const [offers, setOffers] = useState<DbOffer[]>([]);
  const [testimonials, setTestimonials] = useState<DbTestimonial[]>([]);
  const [homepageBlocks, setHomepageBlocks] = useState<DbHomepageBlock[]>([]);
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [inquiries, setInquiries] = useState<DbContactInquiry[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);

  // Filters & Search
  const [tourSearch, setTourSearch] = useState("");
  const [tourCategoryFilter, setTourCategoryFilter] = useState("all");
  const [destSearch, setDestSearch] = useState("");
  const [destDivisionFilter, setDestDivisionFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingDestFilter, setBookingDestFilter] = useState("all");
  const [bookingTourFilter, setBookingTourFilter] = useState("all");
  const [bookingDepartureFilter, setBookingDepartureFilter] = useState("all");
  const [bookingDateFrom, setBookingDateFrom] = useState("");
  const [bookingDateTo, setBookingDateTo] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);

  // Modals
  const [tourModal, setTourModal] = useState<{ isOpen: boolean; tour: Partial<DbTour> | null }>({ isOpen: false, tour: null });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: Partial<DbTourCategory> | null }>({ isOpen: false, category: null });
  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);
  const [tourGalleryModal, setTourGalleryModal] = useState<{
    isOpen: boolean;
    tour: DbTour | null;
    gallery: DbTourGalleryItem[];
    isSaving: boolean;
  }>({ isOpen: false, tour: null, gallery: [], isSaving: false });
  const [departuresModal, setDeparturesModal] = useState<{
    isOpen: boolean;
    tour: DbTour | null;
    departures: DbDeparture[];
    newDate: string;
    newSeats: number | string;
    isSaving: boolean;
  }>({
    isOpen: false,
    tour: null,
    departures: [],
    newDate: "",
    newSeats: 40,
    isSaving: false,
  });
  const [modalTourDepartures, setModalTourDepartures] = useState<DbDeparture[]>([]);
  const [modalNewDepDate, setModalNewDepDate] = useState("");
  const [modalNewDepSeats, setModalNewDepSeats] = useState<number | string>(40);
  const [destModal, setDestModal] = useState<{ isOpen: boolean; destination: Partial<DbDestination> | null }>({ isOpen: false, destination: null });
  const [blogModal, setBlogModal] = useState<{ isOpen: boolean; post: Partial<DbBlogPost> | null }>({ isOpen: false, post: null });
  const [offerModal, setOfferModal] = useState<{ isOpen: boolean; offer: Partial<DbOffer> | null }>({ isOpen: false, offer: null });
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; review: Partial<DbTestimonial> | null }>({ isOpen: false, review: null });
  const [inquiryModal, setInquiryModal] = useState<{ isOpen: boolean; inquiry: DbContactInquiry | null }>({ isOpen: false, inquiry: null });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // CMS state
  const [homeCms, setHomeCms] = useState<HomePageCmsContent>(DEFAULT_HOME_PAGE_CMS);
  const [heroCms, setHeroCms] = useState({
    eyebrow: "Premium domestic tours across Bangladesh",
    headline: "Discover Bangladesh,",
    highlight: "your way",
    subheadline: "Curated domestic tours. Trusted local hosts. Book with a small advance and clear the balance on tour day.",
    primary_cta_label: "Explore Tours",
    primary_cta_href: "/tours",
    secondary_cta_label: "Plan My Trip",
    secondary_cta_href: "/contact",
  });
  const [aboutCms, setAboutCms] = useState<AboutPageCmsContent>(DEFAULT_ABOUT_PAGE_CMS);
  const [journalCms, setJournalCms] = useState<JournalPageCmsContent>(DEFAULT_JOURNAL_PAGE_CMS);
  const [sectionToggles, setSectionToggles] = useState({
    hideDestinations: false,
    hideFeaturedTours: false,
    hideTestimonials: false,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    setUser(getStaffUser());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      router.replace("/staff/login?next=/staff/dashboard");
    }
  }, [authChecked, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, alertsRes] = await Promise.all([
        staffFetch("/finance/overview"),
        staffFetch("/alerts?is_acknowledged=false"),
      ]);
      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (alertsRes.ok) {
        const d = await alertsRes.json();
        setAlerts(d.results ?? d);
      }

      const [toursRes, categoriesRes, destsRes, blogRes, offersRes, reviewsRes, cmsRes, bookingsRes, inquiriesRes, customersRes] = await Promise.all([
        staffFetch("/admin/tours"),
        staffFetch("/admin/tour-categories"),
        staffFetch("/admin/destinations"),
        staffFetch("/admin/blog-posts"),
        staffFetch("/admin/offers"),
        staffFetch("/admin/testimonials"),
        staffFetch("/admin/cms"),
        staffFetch("/admin/bookings"),
        staffFetch("/admin/inquiries"),
        staffFetch("/admin/customers"),
      ]);

      if (toursRes.ok) setTours((await toursRes.json()).results || []);
      if (categoriesRes && categoriesRes.ok) setTourCategories((await categoriesRes.json()).results || []);
      if (destsRes.ok) setDestinations((await destsRes.json()).results || []);
      if (blogRes.ok) setBlogPosts((await blogRes.json()).results || []);
      if (offersRes.ok) setOffers((await offersRes.json()).results || []);
      if (reviewsRes.ok) setTestimonials((await reviewsRes.json()).results || []);
      if (bookingsRes.ok) setBookings((await bookingsRes.json()).results || []);
      if (inquiriesRes.ok) setInquiries((await inquiriesRes.json()).results || []);
      if (customersRes.ok) setCustomers((await customersRes.json()).results || []);

      fetch("/api/v1/track")
        .then((r) => r.json())
        .then((d) => {
          if (d?.success) setTrackingData(d);
        })
        .catch(() => {});

      if (cmsRes.ok) {
        const blocks: DbHomepageBlock[] = (await cmsRes.json()).results || [];
        setHomepageBlocks(blocks);
        const homeBlock = blocks.find((b) => b.block_type === "home_page" || b.id === "block-home-page");
        if (homeBlock && homeBlock.content) {
          setHomeCms((prev) => ({ ...prev, ...(homeBlock.content as Partial<HomePageCmsContent>) }));
        }
        const heroBlock = blocks.find((b) => b.block_type === "hero");
        if (heroBlock && heroBlock.content) {
          setHeroCms((prev) => ({ ...prev, ...(heroBlock.content as Record<string, string>) }));
          setHomeCms((prev) => ({
            ...prev,
            hero_media_type: (homeBlock?.content as any)?.hero_media_type ?? (heroBlock.content as any)?.hero_media_type ?? prev.hero_media_type,
            hero_video_url: (homeBlock?.content as any)?.hero_video_url ?? (heroBlock.content as any)?.hero_video_url ?? prev.hero_video_url,
            hero_slides: (homeBlock?.content as any)?.hero_slides ?? (heroBlock.content as any)?.hero_slides ?? prev.hero_slides,
          }));
        }
        const aboutBlock = blocks.find((b) => b.block_type === "about_page" || b.id === "block-about-page");
        if (aboutBlock && aboutBlock.content) {
          setAboutCms((prev) => ({ ...prev, ...(aboutBlock.content as Partial<AboutPageCmsContent>) }));
        }
        const journalBlock = blocks.find((b) => b.block_type === "journal_page" || b.id === "block-journal-page");
        if (journalBlock && journalBlock.content) {
          setJournalCms((prev) => ({ ...prev, ...(journalBlock.content as Partial<JournalPageCmsContent>) }));
        }
        const destBlock = blocks.find((b) => b.block_type === "destination_grid");
        const tourBlock = blocks.find((b) => b.block_type === "featured_tours");
        const testBlock = blocks.find((b) => b.block_type === "testimonials");
        setSectionToggles({
          hideDestinations: (destBlock?.content as { hidden?: boolean })?.hidden === true,
          hideFeaturedTours: (tourBlock?.content as { hidden?: boolean })?.hidden === true,
          hideTestimonials: (testBlock?.content as { hidden?: boolean })?.hidden === true,
        });
      }
    } catch {
      showNotification("error", "Could not synchronize dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked && user) {
      loadData();
    }
  }, [authChecked, user, loadData]);

  async function acknowledgeAlert(id: string) {
    const previous = alerts;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const res = await staffFetch(`/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_acknowledged: true }),
    });
    if (!res.ok) {
      setAlerts(previous);
      showNotification("error", "Failed to acknowledge alert");
    } else {
      showNotification("success", "Alert acknowledged");
    }
  }

  // Tour Handlers
  async function handleSaveTour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tour = tourModal.tour || {};

    const basePrice = formData.get("base_price") as string;
    const discountValue = (formData.get("discount_value") as string) || "0";
    const destSlug = (formData.get("destination_slug") as string) || destinations[0]?.slug || "bangladesh";
    const matchDest = destinations.find((d) => d.slug === destSlug);

    const payload: Partial<DbTour> = {
      id: tour.id,
      title: formData.get("title") as string,
      slug: (formData.get("slug") as string) || (formData.get("title") as string).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      destination_slug: destSlug,
      destination_name: matchDest?.name || destSlug,
      category: formData.get("category") as string,
      short_description: formData.get("short_description") as string,
      full_description: formData.get("full_description") as string,
      hero_image: normalizeImageUrl((formData.get("hero_image") as string)) || null,
      duration_days: Number(formData.get("duration_days")),
      duration_nights: Number(formData.get("duration_nights")),
      base_price: basePrice,
      discount_type: Number(discountValue) > 0 ? "flat" : "none",
      discount_value: discountValue,
      final_price: String(Math.max(0, Number(basePrice) - Number(discountValue))),
      allow_partial_payment: formData.get("allow_partial_payment") === "on",
      advance_payment_percent: formData.get("advance_payment_percent") as string,
      advance_amount: String(Math.round((Math.max(0, Number(basePrice) - Number(discountValue)) * Number(formData.get("advance_payment_percent") || 40)) / 100)),
      inclusions: ((formData.get("inclusions") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
      exclusions: ((formData.get("exclusions") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
      accommodation_notes: ((formData.get("accommodation_notes") as string) || "").trim() || tour.accommodation_notes || "Standard hotel / resort",
      transportation_notes: ((formData.get("transportation_notes") as string) || "").trim() || tour.transportation_notes || "AC Bus / Private Jeep",
      meals_notes: ((formData.get("meals_notes") as string) || "").trim() || tour.meals_notes || "Breakfast included",
      places_to_visit: ((formData.get("places_to_visit") as string) || "")
        .split("\n")
        .flatMap((s) => s.split(","))
        .map((s) => s.trim())
        .filter(Boolean),
      meeting_point: formData.get("meeting_point") as string,
      pickup_points: ((formData.get("pickup_points") as string) || "")
        .split("\n")
        .flatMap((s) => s.split(","))
        .map((s) => s.trim())
        .filter(Boolean),
      departure_schedule: formData.get("departure_schedule") as string,
      total_seats: Number(formData.get("total_seats") || 40),
      departures: modalTourDepartures,
      is_featured: formData.get("is_featured") === "on",
      status: formData.get("status") as "published" | "draft",
      gallery: tour.gallery || [],
    };

    const isEdit = Boolean(tour.id);
    const url = isEdit ? `/admin/tours/${tour.id}` : "/admin/tours";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showNotification("success", `Tour package ${isEdit ? "updated" : "created"} successfully.`);
      setTourModal({ isOpen: false, tour: null });
      loadData();
    } else {
      showNotification("error", "Failed to save tour.");
    }
  }

  async function handleDeleteTour(id: string) {
    if (!confirm("Are you sure you want to delete this tour package?")) return;
    const res = await staffFetch(`/admin/tours/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", "Tour removed.");
      loadData();
    } else {
      showNotification("error", "Failed to delete tour.");
    }
  }

  async function handleToggleTourStatus(tour: DbTour) {
    const nextStatus = tour.status === "published" ? "draft" : "published";
    const res = await staffFetch(`/admin/tours/${tour.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...tour, status: nextStatus }),
    });
    if (res.ok) {
      showNotification("success", `Tour status changed to ${nextStatus}.`);
      loadData();
    }
  }

  // Tour Category Handlers
  async function handleSaveTourCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cat = categoryModal.category || {};
    const name = ((formData.get("name") as string) || "").trim();
    if (!name) {
      showNotification("error", "Category name is required.");
      return;
    }
    const slug = ((formData.get("slug") as string) || "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const payload: Partial<DbTourCategory> = {
      id: cat.id,
      name,
      slug,
      description: ((formData.get("description") as string) || "").trim(),
      badge: ((formData.get("badge") as string) || "").trim(),
      icon: ((formData.get("icon") as string) || "🏷️").trim(),
      is_active: formData.get("is_active") === "on",
    };

    const isEdit = Boolean(cat.id);
    const url = isEdit ? `/admin/tour-categories/${cat.id}` : "/admin/tour-categories";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      showNotification("success", `Tour category "${name}" ${isEdit ? "updated" : "created"} successfully.`);
      setCategoryModal({ isOpen: false, category: null });
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to save category.");
    }
  }

  async function handleDeleteTourCategory(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete tour category "${name}"?`)) return;
    const res = await staffFetch(`/admin/tour-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", `Category "${name}" removed.`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to delete category.");
    }
  }

  async function handleToggleCategoryActive(cat: DbTourCategory) {
    const nextActive = !cat.is_active;
    const res = await staffFetch(`/admin/tour-categories/${cat.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...cat, is_active: nextActive }),
    });
    if (res.ok) {
      showNotification("success", `Category "${cat.name}" is now ${nextActive ? "active" : "hidden"}.`);
      loadData();
    } else {
      showNotification("error", "Failed to update category status.");
    }
  }

  function openTourGalleryModal(tour: DbTour) {
    const rawGallery: DbTourGalleryItem[] = Array.isArray(tour.gallery) ? JSON.parse(JSON.stringify(tour.gallery)) : [];
    setTourGalleryModal({
      isOpen: true,
      tour,
      gallery: rawGallery,
      isSaving: false,
    });
  }

  function handleAddGalleryImage() {
    if (!tourGalleryModal.tour) return;
    const destName = tourGalleryModal.tour.destination_name || "Bangladesh";
    const existingCount = tourGalleryModal.gallery.length;

    let suggestedSlot = "featured_main";
    if (existingCount === 0) {
      suggestedSlot = "featured_main";
    } else if (existingCount >= 1 && existingCount <= 4) {
      suggestedSlot = `grid_${existingCount}`;
    } else if (existingCount === 5) {
      suggestedSlot = "panorama";
    } else {
      suggestedSlot = "grid_1";
    }

    const newItem: DbTourGalleryItem = {
      id: `img-${Date.now()}-${existingCount}`,
      image: "",
      title: `${tourGalleryModal.tour.title} View ${existingCount + 1}`,
      caption: "",
      location: destName,
      price: tourGalleryModal.tour.final_price ? `৳${Number(tourGalleryModal.tour.final_price).toLocaleString("en-BD")}` : "",
      badge: "",
      watermarkText: "",
      slot: suggestedSlot,
    };

    setTourGalleryModal((prev) => ({
      ...prev,
      gallery: [...prev.gallery, newItem],
    }));
  }

  function handleRemoveGalleryImage(index: number) {
    setTourGalleryModal((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  }

  function handleMoveGalleryImage(index: number, direction: "up" | "down") {
    setTourGalleryModal((prev) => {
      const nextList = [...prev.gallery];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextList.length) return prev;
      const temp = nextList[index];
      nextList[index] = nextList[targetIndex];
      nextList[targetIndex] = temp;
      return { ...prev, gallery: nextList };
    });
  }

  function handleUpdateGalleryItem(index: number, field: keyof DbTourGalleryItem, value: any) {
    setTourGalleryModal((prev) => {
      const nextList = [...prev.gallery];
      nextList[index] = { ...nextList[index], [field]: value };
      return { ...prev, gallery: nextList };
    });
  }

  async function handleSaveTourGallery() {
    if (!tourGalleryModal.tour) return;
    setTourGalleryModal((prev) => ({ ...prev, isSaving: true }));
    try {
      const tourId = tourGalleryModal.tour.id;
      const updatedGallery = tourGalleryModal.gallery.map((g, idx) => ({
        id: g.id || `img-${Date.now()}-${idx}`,
        image: normalizeImageUrl(g.image || (g as any).imageUrl || ""),
        caption: g.caption || g.title || "",
        title: g.title || g.caption || "",
        location: g.location || tourGalleryModal.tour?.destination_name || "",
        price: g.price !== undefined ? String(g.price) : "",
        badge: g.badge || "",
        watermarkText: g.watermarkText || "",
        slot: g.slot || "",
      }));

      const res = await staffFetch(`/admin/tours/${tourId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...tourGalleryModal.tour,
          gallery: updatedGallery,
        }),
      });

      if (res.ok) {
        showNotification("success", "Tour gallery photos saved successfully!");
        setTourGalleryModal({ isOpen: false, tour: null, gallery: [], isSaving: false });
        loadData();
      } else {
        showNotification("error", "Failed to save tour gallery.");
        setTourGalleryModal((prev) => ({ ...prev, isSaving: false }));
      }
    } catch {
      showNotification("error", "An error occurred while saving gallery.");
      setTourGalleryModal((prev) => ({ ...prev, isSaving: false }));
    }
  }

  function openTourModal(tour: Partial<DbTour> | null) {
    setTourModal({ isOpen: true, tour });
    setModalTourDepartures(Array.isArray(tour?.departures) ? [...tour.departures] : []);
    setModalNewDepDate("");
    setModalNewDepSeats(tour?.total_seats || 40);
  }

  function openDeparturesModal(tour: DbTour) {
    setDeparturesModal({
      isOpen: true,
      tour,
      departures: Array.isArray(tour.departures) ? [...tour.departures] : [],
      newDate: "",
      newSeats: tour.total_seats || 40,
      isSaving: false,
    });
  }

  async function handleSaveDeparturesModal() {
    if (!departuresModal.tour) return;
    setDeparturesModal((prev) => ({ ...prev, isSaving: true }));
    try {
      const res = await staffFetch(`/admin/tours/${departuresModal.tour.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...departuresModal.tour,
          departures: departuresModal.departures,
        }),
      });

      if (res.ok) {
        showNotification("success", "Scheduled departures & seat capacities updated successfully.");
        setDeparturesModal({
          isOpen: false,
          tour: null,
          departures: [],
          newDate: "",
          newSeats: 40,
          isSaving: false,
        });
        loadData();
      } else {
        const body = await res.json().catch(() => ({}));
        showNotification("error", body.detail || "Failed to update departures.");
      }
    } catch {
      showNotification("error", "Error updating departures. Please try again.");
    } finally {
      setDeparturesModal((prev) => ({ ...prev, isSaving: false }));
    }
  }

  // Destination Handlers
  async function handleSaveDestination(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dest = destModal.destination || {};

    const nameStr = ((formData.get("name") as string) || "").trim();
    const slugInput = ((formData.get("slug") as string) || "").trim();
    const rawDivision = ((formData.get("division") as string) || "").trim();
    const formattedDivision = rawDivision ? rawDivision.charAt(0).toUpperCase() + rawDivision.slice(1).toLowerCase() : "Chattogram";

    const payload: Partial<DbDestination> = {
      id: dest.id,
      name: nameStr || dest.name || "New Destination",
      slug: slugInput || dest.slug || nameStr.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      division: formattedDivision,
      tagline: (formData.get("tagline") as string) || "",
      description: (formData.get("description") as string) || "",
      best_time_to_visit: (formData.get("best_time_to_visit") as string) || "",
      weather_notes: (formData.get("weather_notes") as string) || "",
      popular_attractions: ((formData.get("popular_attractions") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
      recommended_accommodation: (formData.get("recommended_accommodation") as string) || "",
      travel_tips: (formData.get("travel_tips") as string) || "",
      permits_required: dest.permits_required || "None",
      gallery: dest.gallery || [],
      cover_image: normalizeImageUrl((formData.get("cover_image") as string)) || null,
      cover_video_url: (formData.get("cover_video_url") as string) || "",
      is_featured: formData.get("is_featured") === "on",
      status: (formData.get("status") as "published" | "draft") || "published",
    };

    const isEdit = Boolean(dest.id);
    const url = isEdit ? `/admin/destinations/${dest.id}` : "/admin/destinations";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showNotification("success", `Destination ${isEdit ? "updated" : "created"} successfully.`);
      setDestModal({ isOpen: false, destination: null });
      loadData();
    } else {
      showNotification("error", "Failed to save destination.");
    }
  }

  async function handleDeleteDestination(id: string) {
    if (!confirm("Are you sure you want to delete this destination?")) return;
    const res = await staffFetch(`/admin/destinations/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", "Destination removed.");
      loadData();
    } else {
      showNotification("error", "Failed to delete destination.");
    }
  }

  async function handleDeleteCustomer(id: string, name?: string) {
    if (!confirm(`Are you sure you want to delete customer "${name || id}"? This will also remove the traveler from the connected database.`)) return;
    const res = await staffFetch(`/admin/customers`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showNotification("success", "Traveler profile removed.");
      setSelectedCustomer(null);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.error || "Failed to delete traveler.");
    }
  }

  // Blog Handlers
  async function handleSaveBlog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const post = blogModal.post || {};
    const content = (formData.get("content") as string) || "";
    const catName = (formData.get("category") as string) || "Travel Guide";
    const author = (formData.get("author") as string) || "Savar Tour Lover Editorial Team";
    const heroImage = normalizeImageUrl((formData.get("hero_image") as string)) || null;
    const excerpt = (formData.get("excerpt") as string) || content.slice(0, 160);
    const isFeatured = formData.get("is_featured") === "on";

    const payload: Partial<DbBlogPost> = {
      id: post.id,
      title: formData.get("title") as string,
      slug: (formData.get("slug") as string) || (formData.get("title") as string).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      author,
      author_name: author,
      category: { name: catName },
      body: content,
      content,
      excerpt,
      cover_image: heroImage,
      hero_image: heroImage,
      read_time_minutes: Number(formData.get("read_time_minutes") || 5),
      tags: ((formData.get("tags") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
      status: formData.get("is_published") === "on" ? "published" : "draft",
      is_published: formData.get("is_published") === "on",
      is_featured: isFeatured,
    };

    const isEdit = Boolean(post.id);
    const url = isEdit ? `/admin/blog-posts/${post.id}` : "/admin/blog-posts";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      showNotification("success", `Article ${isEdit ? "updated" : "published"} successfully.`);
      setBlogModal({ isOpen: false, post: null });
      loadData();
    } else {
      showNotification("error", "Failed to save article.");
    }
  }

  async function handleDeleteBlog(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;
    const res = await staffFetch(`/admin/blog-posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", "Article removed.");
      loadData();
    } else {
      showNotification("error", "Failed to delete article.");
    }
  }

  async function handleToggleBlogStatus(post: DbBlogPost) {
    const nextStatus = post.status === "published" ? "draft" : "published";
    const res = await staffFetch(`/admin/blog-posts/${post.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...post, status: nextStatus, is_published: nextStatus === "published" }),
    });
    if (res.ok) {
      showNotification("success", `Article status changed to ${nextStatus}.`);
      loadData();
    }
  }

  async function handleToggleBlogFeatured(post: DbBlogPost) {
    const nextFeatured = !post.is_featured;
    const res = await staffFetch(`/admin/blog-posts/${post.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...post, is_featured: nextFeatured }),
    });
    if (res.ok) {
      showNotification("success", nextFeatured ? "Article marked as featured!" : "Article unmarked from featured.");
      loadData();
    }
  }

  // Offer Handlers
  async function handleSaveOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const offer = offerModal.offer || {};
    const code = (formData.get("code") as string) || "PROMO";
    const selectedTourId = (formData.get("tour_id") as string) || "";
    const matchedTour = selectedTourId
      ? tours.find((t) => t.id === selectedTourId || t.slug === selectedTourId)
      : null;

    const payload: Partial<DbOffer> = {
      id: offer.id,
      code,
      slug: code.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      discount_type: formData.get("discount_type") as "percent" | "flat",
      discount_value: formData.get("discount_value") as string,
      minimum_spend: (formData.get("minimum_spend") as string) || "0",
      tour_id: matchedTour ? matchedTour.id : (selectedTourId || null),
      tour_slug: matchedTour ? matchedTour.slug : null,
      tour_title: matchedTour ? matchedTour.title : null,
      valid_from: formData.get("valid_from") as string,
      valid_until: (formData.get("valid_until") as string) || new Date(Date.now() + 30 * 86400000).toISOString(),
      banner_image: normalizeImageUrl((formData.get("banner_image") as string)) || null,
      is_active: formData.get("is_active") === "on",
    };

    const isEdit = Boolean(offer.id);
    const url = isEdit ? `/admin/offers/${offer.id}` : "/admin/offers";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      showNotification("success", "Promotional offer saved.");
      setOfferModal({ isOpen: false, offer: null });
      loadData();
    } else {
      const errData = await res.json().catch(() => ({}));
      showNotification("error", errData.detail || "Failed to save offer.");
    }
  }

  async function handleDeleteOffer(id: string) {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    const res = await staffFetch(`/admin/offers/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", "Offer removed.");
      loadData();
    }
  }

  // Review Handlers
  async function handleSaveReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rev = reviewModal.review || {};
    const authorName = formData.get("author_name") as string;
    const tourTitle = (formData.get("trip_name") as string) || "Bangladesh Tour";
    const photo = normalizeImageUrl((formData.get("author_avatar") as string)) || null;

    const payload: Partial<DbTestimonial> = {
      id: rev.id,
      customer_name: authorName,
      author_name: authorName,
      tour_title: tourTitle,
      trip_name: tourTitle,
      author_location: (formData.get("author_location") as string) || "Bangladesh",
      rating: Number(formData.get("rating")),
      quote: formData.get("quote") as string,
      customer_photo: photo,
      author_avatar: photo,
      is_featured: formData.get("is_featured") === "on",
    };

    const isEdit = Boolean(rev.id);
    const url = isEdit ? `/admin/testimonials/${rev.id}` : "/admin/testimonials";
    const method = isEdit ? "PUT" : "POST";

    const res = await staffFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      showNotification("success", "Testimonial saved.");
      setReviewModal({ isOpen: false, review: null });
      loadData();
    }
  }

  async function handleDeleteReview(id: string) {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    const res = await staffFetch(`/admin/testimonials/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("success", "Testimonial removed.");
      loadData();
    }
  }

  // CMS Handlers
  async function handleSaveCms() {
    try {
      const res = await staffFetch("/admin/cms", {
        method: "POST",
        body: JSON.stringify({
          id: "block-home-page",
          block_type: "home_page",
          content: homeCms,
        }),
      });

      // Keep block-hero-1 directly in sync for any components that query block-hero-1
      await staffFetch("/admin/cms", {
        method: "POST",
        body: JSON.stringify({
          id: "block-hero-1",
          block_type: "hero",
          content: {
            eyebrow: homeCms.hero_eyebrow,
            headline: homeCms.hero_headline,
            highlight: homeCms.hero_highlight,
            subheadline: homeCms.hero_subheadline,
            primary_cta_label: homeCms.hero_primary_cta_label,
            primary_cta_href: homeCms.hero_primary_cta_href,
            secondary_cta_label: homeCms.hero_secondary_cta_label,
            secondary_cta_href: homeCms.hero_secondary_cta_href,
            hero_media_type: homeCms.hero_media_type,
            hero_video_url: homeCms.hero_video_url,
            hero_slides: homeCms.hero_slides,
          },
        }),
      });

      if (res.ok) {
        showNotification("success", "Homepage configurations updated and published live!");
        loadData();
      } else {
        showNotification("error", "Failed to save CMS configurations.");
      }
    } catch {
      showNotification("error", "Failed to save CMS configurations.");
    }
  }

  // About Page CMS Handler
  async function handleSaveAboutCms() {
    try {
      const res = await staffFetch("/admin/cms", {
        method: "POST",
        body: JSON.stringify({
          id: "block-about-page",
          block_type: "about_page",
          content: aboutCms,
        }),
      });
      if (res.ok) {
        showNotification("success", "About page customization saved and live!");
        loadData();
      } else {
        showNotification("error", "Failed to save About page customization.");
      }
    } catch {
      showNotification("error", "Failed to save About page customization.");
    }
  }

  // Journal Page CMS Settings Handler
  async function handleSaveJournalCms() {
    try {
      const res = await staffFetch("/admin/cms", {
        method: "POST",
        body: JSON.stringify({
          id: "block-journal-page",
          block_type: "journal_page",
          content: journalCms,
        }),
      });
      if (res.ok) {
        showNotification("success", "Journal page settings saved and live!");
        loadData();
      } else {
        showNotification("error", "Failed to save Journal page settings.");
      }
    } catch {
      showNotification("error", "Failed to save Journal page settings.");
    }
  }

  // Booking status updater
  async function handleUpdateBookingStatus(id: string, newStatus: string) {
    const res = await staffFetch("/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      showNotification("success", `Booking status updated to ${newStatus}.`);
      loadData();
    } else {
      showNotification("error", "Failed to update booking status.");
    }
  }

  // Settle Due Balance
  async function handleSettleDue(id: string, reference: string, dueAmount: string) {
    if (!confirm(`Confirm completing the remaining due payment of ৳${Number(dueAmount).toLocaleString()} for booking ${reference} via Hand Cash?`)) {
      return;
    }
    const res = await staffFetch("/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "settle_due", method: "host_cash" }),
    });
    if (res.ok) {
      showNotification("success", `Due payment settled in Hand Cash for booking ${reference}.`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to settle due payment.");
    }
  }

  // Approve Physical Cash Payment (Advance, Full, or Due)
  async function handleApproveCashPayment(id: string, reference: string, receivedType: "advance" | "full" | "due" = "advance") {
    const typeLabel = receivedType === "full" ? "FULL PAYMENT" : receivedType === "due" ? "DUE BALANCE" : "ADVANCE DEPOSIT";
    if (!confirm(`Are you sure you want to approve physical cash received (${typeLabel}) for booking ${reference}?\n\nThis will credit the payment in the database and update clearance.`)) {
      return;
    }
    const res = await staffFetch("/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "approve_cash_payment", received_type: receivedType }),
    });
    if (res.ok) {
      showNotification("success", `Physical cash payment (${typeLabel}) approved for ${reference}!`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to approve cash payment.");
    }
  }

  // Reject Physical Cash Payment
  async function handleRejectCashPayment(id: string, reference: string, rejectType?: "advance" | "due") {
    const isDue = rejectType === "due";
    const reason = prompt(
      `Enter rejection reason for booking ${reference} (optional):`,
      isDue ? "Due cash was not received by host." : "Physical cash was not received at counter."
    );
    if (reason === null) return;
    const res = await staffFetch("/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "reject_cash_payment", reason, reject_type: rejectType }),
    });
    if (res.ok) {
      showNotification(
        "success",
        isDue
          ? `Due cash request rejected for ${reference}. Booking remains active.`
          : `Booking ${reference} has been cancelled and seats released.`
      );
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to reject booking.");
    }
  }

  // Approve Pending Rocket Online Verification
  async function handleApproveRocketPayment(id: string, reference: string, trxId?: string) {
    if (!confirm(`Are you sure you want to approve Rocket payment for booking ${reference}?\nTrxID: ${trxId || "N/A"}\n\nThis will mark the booking as confirmed and credit the transaction.`)) {
      return;
    }
    const res = await staffFetch("/staff/rocket/approve", {
      method: "POST",
      body: JSON.stringify({ booking_id: id, admin_name: user?.username || "Staff Admin" }),
    });
    if (res.ok) {
      showNotification("success", `Rocket payment approved for booking ${reference}!`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to approve Rocket payment.");
    }
  }

  // Reject Pending Rocket Verification (Fake TrxID / Timeout)
  async function handleRejectRocketPayment(id: string, reference: string, trxId?: string) {
    const reason = prompt(
      `Enter rejection reason for booking ${reference} (TrxID: ${trxId || "None"}):`,
      "Rocket TrxID could not be verified in bank records"
    );
    if (reason === null) return;
    const res = await staffFetch("/staff/rocket/reject", {
      method: "POST",
      body: JSON.stringify({ booking_id: id, reason }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      showNotification("success", data.message || `Booking ${reference} cancelled and seats released.`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to reject Rocket payment.");
    }
  }

  // Update Customer Pick-up Point
  async function handleUpdatePickupPoint(id: string, reference: string, currentPoint?: string) {
    const newPoint = prompt(`Enter or update Pick-up Point for booking ${reference}:`, currentPoint || "Savar Thana Stand (09:00 PM)");
    if (newPoint === null) return;
    const trimmed = newPoint.trim();
    if (!trimmed) {
      showNotification("error", "Pick-up point cannot be empty.");
      return;
    }
    const res = await staffFetch("/admin/bookings", {
      method: "PATCH",
      body: JSON.stringify({ id, action: "update_pickup_point", pickup_point: trimmed }),
    });
    if (res.ok) {
      showNotification("success", `Pick-up location for ${reference} updated to "${trimmed}".`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      showNotification("error", err.detail || "Failed to update pick-up point.");
    }
  }

  // Inquiry updater
  async function handleSaveInquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inquiryModal.inquiry) return;
    const formData = new FormData(e.currentTarget);
    const status = formData.get("status") as DbContactInquiry["status"];
    const adminNotes = formData.get("admin_notes") as string;

    const res = await staffFetch("/admin/inquiries", {
      method: "PATCH",
      body: JSON.stringify({
        id: inquiryModal.inquiry.id,
        status,
        admin_notes: adminNotes,
      }),
    });

    if (res.ok) {
      showNotification("success", "Inquiry updated.");
      setInquiryModal({ isOpen: false, inquiry: null });
      loadData();
    } else {
      showNotification("error", "Failed to update inquiry.");
    }
  }

  if (!authChecked || !user) return null;

  const isSuperAdmin = user.role === "super_admin";

  const filteredTours = tours.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(tourSearch.toLowerCase()) || t.destination_name.toLowerCase().includes(tourSearch.toLowerCase());
    const matchesCat =
      tourCategoryFilter === "all" ||
      t.category === tourCategoryFilter ||
      (Boolean(t.category) && t.category.toLowerCase() === tourCategoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const filteredDestinations = destinations.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(destSearch.toLowerCase()) || d.division.toLowerCase().includes(destSearch.toLowerCase());
    const matchesDiv = destDivisionFilter === "all" || d.division.toLowerCase() === destDivisionFilter.toLowerCase();
    return matchesSearch && matchesDiv;
  });

  const availableBookingTours = (bookingDestFilter === "all"
    ? tours
    : tours.filter((t) => t.destination_slug === bookingDestFilter)
  ) || [];

  const departureDatesList: string[] = (() => {
    const dateSet = new Set<string>();

    for (const t of (tours || [])) {
      if (bookingTourFilter !== "all" && t.id !== bookingTourFilter && t.slug !== bookingTourFilter) continue;
      if (bookingDestFilter !== "all" && t.destination_slug !== bookingDestFilter) continue;

      if (Array.isArray(t.departures)) {
        for (const dep of t.departures) {
          if (dep && dep.departure_date) dateSet.add(dep.departure_date.slice(0, 10));
        }
      }
    }

    for (const b of (bookings || [])) {
      if (!b) continue;
      if (bookingTourFilter !== "all" && b.tour_id !== bookingTourFilter && b.tour_slug !== bookingTourFilter) continue;

      const bTour = (tours || []).find((t) => t && (t.id === b.tour_id || t.slug === b.tour_slug));
      const destMatch =
        bookingDestFilter === "all" ||
        b.destination_slug === bookingDestFilter ||
        bTour?.destination_slug === bookingDestFilter;
      if (!destMatch) continue;

      if (b.departure_date) dateSet.add(b.departure_date.slice(0, 10));
    }

    return Array.from(dateSet).sort();
  })();

  const filteredBookings = (bookings || []).filter((b) => {
    if (!b) return false;

    // 1. Status Filter
    if (bookingStatusFilter !== "all") {
      if (bookingStatusFilter === "confirmed_any") {
        const isConf =
          b.status === "confirmed_advance_paid" ||
          b.status === "confirmed_fully_paid" ||
          b.status === "cleared_on_tour_day";
        if (!isConf) return false;
      } else if (b.status !== bookingStatusFilter) {
        return false;
      }
    }

    // 2. Destination Filter (Match either booking's destination_slug OR the tour's destination_slug)
    if (bookingDestFilter !== "all") {
      const bTour = (tours || []).find((t) => t && (t.id === b.tour_id || t.slug === b.tour_slug));
      const destMatch =
        b.destination_slug === bookingDestFilter ||
        bTour?.destination_slug === bookingDestFilter;
      if (!destMatch) {
        return false;
      }
    }

    // 3. Tour Package Filter
    if (bookingTourFilter !== "all") {
      if (b.tour_id !== bookingTourFilter && b.tour_slug !== bookingTourFilter) {
        return false;
      }
    }

    // 4. Departure Date Filter
    const depDate = b.departure_date ? b.departure_date.slice(0, 10) : "";
    if (bookingDepartureFilter !== "all") {
      if (depDate !== bookingDepartureFilter) {
        return false;
      }
    }

    // 5. Date Range: From
    if (bookingDateFrom) {
      if (!depDate || depDate < bookingDateFrom) {
        return false;
      }
    }

    // 6. Date Range: To
    if (bookingDateTo) {
      if (!depDate || depDate > bookingDateTo) {
        return false;
      }
    }

    // 7. Search Passenger, Seat, Ref or Transaction ID (TrxID)
    if (!bookingSearch.trim()) return true;
    const q = bookingSearch.toLowerCase().trim();
    const guestName = (b.customer_full_name || "").toLowerCase();
    const phone = (b.customer_phone_number || "").toLowerCase();
    const email = (b.customer_email || "").toLowerCase();
    const ref = (b.reference || "").toLowerCase();
    const pickup = (b.pickup_point || "").toLowerCase();
    const tourTitle = (b.tour_title || "").toLowerCase();
    const trx = (b.transaction_id || "").toLowerCase();
    const advTrx = (b.advance_transaction_id || "").toLowerCase();
    const dueTrx = (b.due_transaction_id || "").toLowerCase();
    const advMethod = (b.advance_payment_method || b.payment_method || "").toLowerCase();
    const dueMethod = (b.due_payment_method || "").toLowerCase();
    const seats = Array.isArray(b.selected_seats)
      ? b.selected_seats.join(" ").toLowerCase()
      : (typeof b.selected_seats === "string" ? String(b.selected_seats).toLowerCase() : "");
    const travelersStr = Array.isArray(b.travelers)
      ? b.travelers.map((t: any) => `${t?.full_name || ""} ${t?.seat_number || ""}`).join(" ").toLowerCase()
      : "";

    return (
      guestName.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      ref.includes(q) ||
      pickup.includes(q) ||
      tourTitle.includes(q) ||
      trx.includes(q) ||
      advTrx.includes(q) ||
      dueTrx.includes(q) ||
      advMethod.includes(q) ||
      dueMethod.includes(q) ||
      seats.includes(q) ||
      travelersStr.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
      {/* Top Professional Header */}
      <header className="border-b border-slate-200 bg-white px-3.5 py-2.5 sm:px-6 sm:py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src="/images/logo-badge.png" alt="Savar Tour Lover" className="h-8 sm:h-9 w-auto object-contain shrink-0 drop-shadow-xs" />
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <h1 className="font-semibold text-slate-900 text-sm sm:text-base tracking-tight">{dict.header.title}</h1>
                <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium">
                  {user.role === "super_admin" ? dict.header.superAdmin : (isBn ? dict.header.staff : user.role)}
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {dict.header.cloudStatus}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[160px] sm:max-w-none">
                {dict.header.connected}: <span className="font-medium text-slate-700">{user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm">
            <LanguageToggle variant="compact" />
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition font-medium flex items-center gap-1"
            >
              <span>{dict.header.site}</span>
              <span className="text-slate-400">↗</span>
            </a>
            <button
              onClick={() => loadData()}
              className="rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition font-medium cursor-pointer"
              title={isBn ? "তথ্য রিফ্রেশ করুন" : "Refresh datasets"}
            >
              {dict.header.refresh}
            </button>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition font-medium flex items-center gap-1.5 cursor-pointer"
              title={isBn ? "অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন" : "Change Admin Password"}
            >
              <span>🔑 {dict.header.password}</span>
            </button>
            <button
              onClick={() => {
                clearStaffSession();
                router.push("/staff/login");
              }}
              className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-rose-100 transition font-medium cursor-pointer"
            >
              {dict.header.signOut}
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg border transition-all ${
            notification.type === "success"
              ? "bg-white text-emerald-900 border-emerald-200 shadow-emerald-900/5"
              : "bg-white text-rose-900 border-rose-200 shadow-rose-900/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${notification.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`} />
            {notification.message}
          </div>
        </div>
      )}

      {/* Tab Navigation with Ash Gradient & Visible Scroller */}
      <div className="border-b border-slate-300/80 bg-gradient-to-r from-slate-200 via-slate-100 to-zinc-200 px-3 sm:px-6 shadow-xs">
        <div className="mx-auto max-w-7xl flex items-center gap-1 sm:gap-2 py-1.5">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            aria-label="Scroll tabs left"
            className="hidden sm:flex shrink-0 items-center justify-center h-8 w-8 rounded-lg bg-white/70 hover:bg-white text-slate-600 hover:text-slate-950 shadow-xs border border-slate-300/70 transition cursor-pointer"
            title="Scroll left"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Scrollable Tabs Bar with Visible Scroller */}
          <div
            ref={tabScrollRef}
            className="admin-tab-scroller flex-1 flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 scroll-smooth"
          >
            {[
              { id: "overview", label: dict.tabs.overview, count: null },
              ...(isSuperAdmin
                ? [
                    { id: "tours", label: dict.tabs.tours, count: tours.length },
                    { id: "destinations", label: dict.tabs.destinations, count: destinations.length },
                    { id: "users", label: dict.tabs.users, count: customers.length },
                    { id: "bookings", label: dict.tabs.bookings, count: bookings.length },
                    { id: "reports", label: dict.tabs.reports, count: bookings.length },
                    { id: "cms", label: dict.tabs.cms, count: null },
                    { id: "about_cms", label: dict.tabs.about_cms, count: null },
                    { id: "blog", label: dict.tabs.blog, count: blogPosts.length },
                    { id: "offers", label: dict.tabs.offers, count: offers.length },
                    { id: "reviews", label: dict.tabs.reviews, count: testimonials.length },
                    { id: "inquiries", label: dict.tabs.inquiries, count: inquiries.length },
                    { id: "seo", label: dict.tabs.seo, count: null },
                  ]
                : []),
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/25 border border-sky-300/70 ring-1 ring-sky-400/40"
                      : "text-slate-700 hover:text-slate-950 hover:bg-white/70 border border-transparent"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                        isSelected
                          ? "bg-white/25 text-white border border-white/30 backdrop-blur-xs shadow-xs"
                          : "bg-slate-300/70 text-slate-700 border border-slate-300/90"
                      }`}
                    >
                      {num(tab.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            aria-label="Scroll tabs right"
            className="hidden sm:flex shrink-0 items-center justify-center h-8 w-8 rounded-lg bg-white/70 hover:bg-white text-slate-600 hover:text-slate-950 shadow-xs border border-slate-300/70 transition cursor-pointer"
            title="Scroll right"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full p-3 sm:p-6 md:p-8">
        {loading && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block h-2 w-2 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            Updating datasets…
          </div>
        )}

        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 sm:space-y-8">
            {/* Quick Actions Card */}
            {isSuperAdmin && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{dict.overview.quickActionsTitle}</h2>
                    <p className="text-xs text-slate-500">{dict.overview.quickActionsSubtitle}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setTourModal({ isOpen: true, tour: null })}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.addTour}
                    </button>
                    <button
                      onClick={() => setActiveTab("reports")}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-xs text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.reports}
                    </button>
                    <button
                      onClick={() => setDestModal({ isOpen: true, destination: null })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.addDest}
                    </button>
                    <button
                      onClick={() => setActiveTab("cms")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.editHome}
                    </button>
                    <button
                      onClick={() => setActiveTab("about_cms")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.editAbout}
                    </button>
                    <button
                      onClick={() => setBlogModal({ isOpen: true, post: null })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.newPost}
                    </button>
                    <button
                      onClick={() => setOfferModal({ isOpen: true, offer: null })}
                      className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center justify-center flex items-center cursor-pointer"
                    >
                      {dict.overview.newPromo}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Supabase Cloud Database Status Banner */}
            <div className="rounded-xl border border-emerald-100 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-xs shrink-0">
                    DB
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{dict.overview.dbTitle}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] sm:text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {dict.overview.dbSync}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 break-all sm:break-normal">
                      {dict.overview.dbHost}: <span className="font-mono text-slate-700 font-medium">Supabase Cloud</span> • {dict.overview.dbStorage}: <span className="font-mono text-slate-700 font-medium">tourlover-data</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200">
                    {dict.overview.dualLayer}
                  </span>
                </div>
              </div>
            </div>

            {/* Profit Dashboard Section */}
            <div>
              <div className="mb-2.5 sm:mb-3">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500">{dict.overview.financialSummary}</h2>
                <p className="text-xs sm:text-sm font-medium text-slate-800">{dict.overview.financialSubtitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.revenue}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{bdt(overview?.total_revenue ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.directCosts}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{bdt(overview?.total_direct_cost ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.grossMargin}</p>
                  <p className={`mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold ${Number(overview?.gross_profit) >= 0 ? "text-emerald-700" : "text-slate-900"}`}>
                    {bdt(overview?.gross_profit ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.operatingExp}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{bdt(overview?.total_operational_expense ?? 0)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.netProfit}</p>
                  <p className={`mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold ${Number(overview?.net_profit) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {bdt(overview?.net_profit ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Receivables & Inventory */}
            <div>
              <div className="mb-2.5 sm:mb-3">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500">{dict.overview.capacityTitle}</h2>
                <p className="text-xs sm:text-sm font-medium text-slate-800">{dict.overview.capacitySubtitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs cursor-pointer hover:border-slate-300 transition" onClick={() => setActiveTab("bookings")}>
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.totalBookings}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{num(overview?.bookings_count ?? bookings.length)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs cursor-pointer hover:border-slate-300 transition" onClick={() => setActiveTab("tours")}>
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.publishedTours}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{num(overview?.active_tours_count ?? tours.length)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.pendingAdvances}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">{bdt(overview?.pending_advances ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.dueOnTourDay}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-amber-700">{bdt(overview?.due_on_tour_day ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Server-Side Tracking & Web Analytics */}
            <div>
              <div className="mb-2.5 sm:mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500">{dict.overview.trackingTitle}</h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-800">{dict.overview.trackingSubtitle}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {dict.overview.trackingActive}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.pageViews24h}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-emerald-700">
                    {num(trackingData?.stats?.pageViews24h ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.totalViews}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">
                    {num(trackingData?.stats?.totalPageViews ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.uniqueVisitors}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">
                    {num(trackingData?.stats?.uniqueVisitors ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
                  <p className="text-[11px] sm:text-xs uppercase tracking-wide font-medium text-slate-500">{dict.overview.activeSessions}</p>
                  <p className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-slate-900">
                    {num(trackingData?.stats?.uniqueSessions ?? 0)}
                  </p>
                </div>
              </div>

              {/* Conversion Events & Top Pages Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Top Visited Pages */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{dict.overview.topRoutes}</h3>
                  {trackingData?.stats?.topPages && trackingData.stats.topPages.length > 0 ? (
                    <div className="space-y-2">
                      {trackingData.stats.topPages.slice(0, 5).map((p) => (
                        <div key={p.path} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-700 truncate max-w-[200px]" title={p.path}>
                            {p.path}
                          </span>
                          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {num(p.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{dict.overview.noRoutes}</p>
                  )}
                </div>

                {/* Traffic Sources & Referrers */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{dict.overview.trafficSources}</h3>
                  {trackingData?.stats?.topSources && trackingData.stats.topSources.length > 0 ? (
                    <div className="space-y-2">
                      {trackingData.stats.topSources.slice(0, 5).map((s) => (
                        <div key={s.source} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate max-w-[200px]" title={s.source}>
                            {s.source}
                          </span>
                          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {num(s.count)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{dict.overview.noSources}</p>
                  )}
                </div>

                {/* Conversion Events Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{dict.overview.conversionEvents}</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{dict.overview.bookingsCreated}:</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {num(trackingData?.stats?.eventCounts?.booking_created ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{dict.overview.paymentsConfirmed}:</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {num(trackingData?.stats?.eventCounts?.payment_success ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{dict.overview.inquiriesSubmitted}:</span>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {num(trackingData?.stats?.eventCounts?.contact_inquiry ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">Tour Page Views:</span>
                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {trackingData?.stats?.eventCounts?.tour_view ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Alerts */}
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
                System & Operational Alerts ({alerts.length})
              </h2>
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-xs">
                  No pending operational alerts. All departures and bookings are clear.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          SEVERITY_BADGES[a.severity] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {a.severity}
                        </span>
                        <span className="text-slate-800">{a.message}</span>
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(a.id)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Tables Snapshot */}
            {isSuperAdmin && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Recent Customer Bookings</h3>
                    <button
                      onClick={() => setActiveTab("bookings")}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      View All ({bookings.length}) →
                    </button>
                  </div>
                  {bookings.length === 0 ? (
                    <p className="text-xs text-slate-500">No bookings recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.slice(0, 4).map((b) => (
                        <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                          <div>
                            <span className="font-mono font-medium text-slate-900">{b.reference}</span>
                            <span className="text-slate-600 ml-2">{b.customer_full_name}</span>
                            <div className="text-slate-500 mt-0.5">{b.tour_title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                              {b.pickup_point && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-900 border border-amber-200">
                                  📍 {b.pickup_point}
                                </span>
                              )}
                              {b.selected_seats && b.selected_seats.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800 border border-emerald-200">
                                  💺 {b.selected_seats.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-900">{formatBDT(b.amount_paid)}</span>
                            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">{b.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Recent Inquiries</h3>
                    <button
                      onClick={() => setActiveTab("inquiries")}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      View All ({inquiries.length}) →
                    </button>
                  </div>
                  {inquiries.length === 0 ? (
                    <p className="text-xs text-slate-500">No inquiries recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {inquiries.slice(0, 4).map((inq) => (
                        <div key={inq.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                          <div>
                            <span className="font-medium text-slate-900">{inq.name}</span>
                            <span className="text-slate-500 ml-2">{inq.phone}</span>
                            <div className="text-slate-500 mt-0.5">Dest: {inq.destination || "Custom"}</div>
                          </div>
                          <button
                            onClick={() => setInquiryModal({ isOpen: true, inquiry: inq })}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Follow up
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TOURS TAB ================= */}
        {activeTab === "tours" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.tours.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {dict.tours.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setManageCategoriesModalOpen(true)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏷️</span>
                  <span>{dict.tours.manageCategories}</span>
                  {tourCategories.length > 0 && (
                    <span className="rounded-full bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-bold">
                      {num(tourCategories.length)}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => openTourModal(null)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span> {dict.tours.addTour}
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder={dict.tours.searchPlaceholder}
                value={tourSearch}
                onChange={(e) => setTourSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-w-[260px] shadow-xs"
              />
              <select
                value={tourCategoryFilter}
                onChange={(e) => setTourCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
              >
                <option value="all">{dict.tours.allCategories} ({tourCategories.length > 0 ? num(tourCategories.length) : (isBn ? "সকল" : "All")})</option>
                {tourCategories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 ml-auto">
                {dict.tours.showingCount(num(filteredTours.length), num(tours.length))}
              </span>
            </div>

            {/* Tours Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTours.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2.5">
                      <span className="font-semibold text-emerald-800 uppercase tracking-wider text-[11px]">{t.category}</span>
                      <button
                        onClick={() => handleToggleTourStatus(t)}
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition cursor-pointer ${
                          t.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }`}
                        title="Click to toggle status"
                      >
                        {t.status === "published" ? dict.tours.published : dict.tours.draft}
                      </button>
                    </div>

                    <h3 className="font-semibold text-base text-slate-900">{t.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.destination_name} · {num(t.duration_days)} {dict.tours.days} / {num(t.duration_nights)} {dict.tours.nights} · {num(t.total_seats)} {dict.tours.seats}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-3 leading-relaxed">{t.short_description}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-900">{bdt(t.final_price)}</span>
                      {Number(t.discount_value) > 0 && (
                        <span className="text-xs text-slate-400 line-through">{bdt(t.base_price)}</span>
                      )}
                      <span className="text-xs text-slate-500 ml-auto font-medium">{num(t.advance_payment_percent)}% {dict.tours.advanceRequired}</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {dict.tours.activeDepartures(num(t.departures?.length || 0))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDeparturesModal(t)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Manage Scheduled Departures & Seat Capacity"
                      >
                        <span>{dict.tours.departuresBtn}</span>
                        <span className="bg-emerald-200 text-emerald-900 rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                          {num(t.departures?.length || 0)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTourGalleryModal(t)}
                        className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Manage Tour Photos & Scenery Gallery (Bento Layout)"
                      >
                        <span>{dict.tours.galleryBtn}</span>
                        <span className="bg-amber-200 text-amber-900 rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                          {num(t.gallery?.length || 0)}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openTourModal(t)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {dict.tours.editBtn}
                      </button>
                      <button
                        onClick={() => handleDeleteTour(t.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-2.5 py-1.5 text-xs font-medium hover:bg-rose-100 transition cursor-pointer"
                      >
                        {dict.tours.deleteBtn}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= DESTINATIONS TAB ================= */}
        {activeTab === "destinations" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.destinations.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {dict.destinations.subtitle}
                </p>
              </div>
              <button
                onClick={() => setDestModal({ isOpen: true, destination: null })}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
              >
                {dict.destinations.addDest}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder={dict.destinations.searchPlaceholder}
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-w-[260px] shadow-xs"
              />
              <select
                value={destDivisionFilter}
                onChange={(e) => setDestDivisionFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
              >
                <option value="all">{dict.destinations.allDivisions}</option>
                <option value="chattogram">{isBn ? "চট্টগ্রাম বিভাগ" : "Chattogram"}</option>
                <option value="sylhet">{isBn ? "সিলেট বিভাগ" : "Sylhet"}</option>
                <option value="khulna">{isBn ? "খুলনা বিভাগ" : "Khulna"}</option>
                <option value="dhaka">{isBn ? "ঢাকা বিভাগ" : "Dhaka"}</option>
                <option value="barishal">{isBn ? "বরিশাল বিভাগ" : "Barishal"}</option>
                <option value="rajshahi">{isBn ? "রাজশাহী বিভাগ" : "Rajshahi"}</option>
              </select>
              <span className="text-xs text-slate-500 ml-auto">
                {dict.destinations.showingCount(num(filteredDestinations.length), num(destinations.length))}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDestinations.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="uppercase tracking-wider font-semibold text-emerald-800 text-[11px]">{d.division} {isBn ? "বিভাগ" : "Division"}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                        d.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {d.status === "published" ? dict.tours.published : dict.tours.draft}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base text-slate-900">{d.name}</h3>
                    {d.tagline && <p className="text-xs text-slate-600 italic mt-0.5">{d.tagline}</p>}
                    <p className="text-xs text-slate-500 mt-1">{dict.destinations.bestTimeToVisit}: {d.best_time_to_visit}</p>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-3 leading-relaxed">{d.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {d.popular_attractions?.slice(0, 3).map((a) => (
                        <span key={a} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDestModal({ isOpen: true, destination: d })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      {dict.destinations.editBtn}
                    </button>
                    <button
                      onClick={() => handleDeleteDestination(d.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-medium hover:bg-rose-100 transition cursor-pointer"
                    >
                      {dict.destinations.deleteBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= FRONTEND CMS CUSTOMIZER TAB ================= */}
        {activeTab === "cms" && (
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.cms.title}</h2>
                <p className="text-sm text-slate-500">
                  {dict.cms.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveCms}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
              >
                {dict.cms.saveChanges}
              </button>
            </div>

            {/* 1. HERO SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">1. Hero Section (Top Banner)</h3>
              </div>

              {/* Background Media Mode Selector */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">Hero Background Media Type</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHomeCms({ ...homeCms, hero_media_type: "slideshow" })}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      (homeCms.hero_media_type ?? "slideshow") === "slideshow"
                        ? "border-emerald-600 bg-white ring-2 ring-emerald-600/20 shadow-xs"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-600"
                    }`}
                  >
                    <span className="text-xl">🌄</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Atmospheric Slideshow</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Rotating scenic Bangladeshi backdrops (Cox&apos;s Bazar, Sajek, Sundarbans, etc.)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHomeCms({ ...homeCms, hero_media_type: "video" })}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      homeCms.hero_media_type === "video"
                        ? "border-emerald-600 bg-white ring-2 ring-emerald-600/20 shadow-xs"
                        : "border-slate-200 bg-white/70 hover:bg-white text-slate-600"
                    }`}
                  >
                    <span className="text-xl">🎬</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Custom Video Background</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Auto-looping video from YouTube, Shorts, Google Drive, Vimeo, or direct MP4</div>
                    </div>
                  </button>
                </div>

                {(homeCms.hero_media_type ?? "slideshow") === "slideshow" && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Slideshow Photo Collection</span>
                        <p className="text-[11px] text-slate-500">
                          Add, edit, or customize hero background photos (Google Drive share links, custom image URLs, or standard media links).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentSlides = homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES;
                          const newSlide: HeroSlideItem = {
                            id: `slide-${Date.now()}`,
                            title: "New Destination",
                            subtitle: "Scenic Bangladesh",
                            image_url: "",
                          };
                          setHomeCms({ ...homeCms, hero_slides: [...currentSlides, newSlide] });
                        }}
                        className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                      >
                        + Add Slide Image
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES).map((slide, idx) => (
                        <div key={slide.id || idx} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800">Slide #{idx + 1}: {slide.title || "Untitled"}</span>
                            {(homeCms.hero_slides && homeCms.hero_slides.length > 1 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentSlides = homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES;
                                  const filtered = currentSlides.filter((_, i) => i !== idx);
                                  setHomeCms({ ...homeCms, hero_slides: filtered });
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
                              Destination / Slide Title
                              <input
                                value={slide.title}
                                onChange={(e) => {
                                  const currentSlides = [...(homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES)];
                                  currentSlides[idx] = { ...currentSlides[idx], title: e.target.value };
                                  setHomeCms({ ...homeCms, hero_slides: currentSlides });
                                }}
                                placeholder="e.g. Cox's Bazar"
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                              />
                            </label>

                            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
                              Subtitle / Motif
                              <input
                                value={slide.subtitle ?? ""}
                                onChange={(e) => {
                                  const currentSlides = [...(homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES)];
                                  currentSlides[idx] = { ...currentSlides[idx], subtitle: e.target.value };
                                  setHomeCms({ ...homeCms, hero_slides: currentSlides });
                                }}
                                placeholder="e.g. World's Longest Natural Sea Beach"
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                              />
                            </label>
                          </div>

                          {/* Image URL Input with Google Drive & Live Preview */}
                          <div className="space-y-1.5">
                            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-700">
                              Slide Image URL (Supports Google Drive share links, custom web URLs, Unsplash, etc.)
                              <input
                                value={slide.image_url}
                                onChange={(e) => {
                                  const currentSlides = [...(homeCms.hero_slides && homeCms.hero_slides.length > 0 ? homeCms.hero_slides : DEFAULT_HERO_SLIDES)];
                                  currentSlides[idx] = { ...currentSlides[idx], image_url: e.target.value };
                                  setHomeCms({ ...homeCms, hero_slides: currentSlides });
                                }}
                                placeholder="Paste Google Drive share link or direct image URL"
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                              />
                            </label>

                            {/* Slide image preview */}
                            {slide.image_url && slide.image_url.trim() && (
                              <div className="relative mt-2 h-24 w-40 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={normalizeImageUrl(slide.image_url)}
                                  alt={slide.title}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-0.5 text-[10px] text-white truncate">
                                  {slide.title}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {homeCms.hero_media_type === "video" && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                      Background Video URL
                      <input
                        value={homeCms.hero_video_url ?? ""}
                        onChange={(e) => setHomeCms({ ...homeCms, hero_video_url: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                        placeholder="Paste any YouTube, YouTube Shorts, Google Drive, Vimeo, Dropbox, or direct .mp4 link"
                      />
                      <span className="text-[11px] text-slate-500">
                        Supports: <strong>YouTube</strong> (full or shorts), <strong>Google Drive</strong> (share link), <strong>Vimeo</strong>, <strong>Dropbox</strong> (raw stream), or direct <strong>.mp4 / .webm</strong>.
                        The video automatically auto-resizes to fit any screen without letterboxing, loops continuously, and plays muted.
                      </span>
                    </label>

                    {/* Live Preview */}
                    {Boolean(homeCms.hero_video_url && homeCms.hero_video_url.trim()) && (
                      <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-white overflow-hidden">
                        <div className="flex items-center justify-between pb-2 text-xs text-slate-400 font-medium">
                          <span>Live Video Preview</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Auto-fit & cover active</span>
                        </div>
                        <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black flex items-center justify-center">
                          {(() => {
                            const normalized = normalizeVideoUrl(homeCms.hero_video_url || "");
                            if (!normalized.url) {
                              return <div className="text-xs text-slate-400">Invalid or unsupported video link</div>;
                            }
                            if (normalized.isIframe) {
                              return (
                                <iframe
                                  src={normalized.url}
                                  title="Video Preview"
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                              );
                            }
                            return (
                              <video
                                src={normalized.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full h-full object-cover"
                              />
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.hero_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="e.g. Domestic tours across Bangladesh"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Headline (Line 1)
                  <input
                    value={homeCms.hero_headline ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_headline: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="e.g. Discover Bangladesh,"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Highlighted Phrase (Line 2 - Emerald Accent)
                <input
                  value={homeCms.hero_highlight ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, hero_highlight: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="e.g. your way"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Subheadline Description
                <textarea
                  rows={3}
                  value={homeCms.hero_subheadline ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, hero_subheadline: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="Describe your agency's promise..."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Primary Button Label
                  <input
                    value={homeCms.hero_primary_cta_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_primary_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Primary Button URL
                  <input
                    value={homeCms.hero_primary_cta_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_primary_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Secondary Button Label
                  <input
                    value={homeCms.hero_secondary_cta_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_secondary_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Secondary Button URL
                  <input
                    value={homeCms.hero_secondary_cta_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, hero_secondary_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* 2. POPULAR DESTINATIONS SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2. Popular Destinations Grid</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.destinations_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, destinations_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide this section on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.destinations_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, destinations_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.destinations_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, destinations_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.destinations_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, destinations_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button Label
                  <input
                    value={homeCms.destinations_cta_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, destinations_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button URL
                  <input
                    value={homeCms.destinations_cta_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, destinations_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* 3. POPULAR TOURS SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">3. Popular Tour Packages Explorer</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.tours_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, tours_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide this section on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.tours_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, tours_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.tours_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, tours_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.tours_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, tours_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button Label
                  <input
                    value={homeCms.tours_cta_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, tours_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button URL
                  <input
                    value={homeCms.tours_cta_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, tours_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* 4. WHY US SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">4. Why Choose Us (Value Proposition)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Edit section headings and dynamically add or remove feature cards</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homeCms.why_us_hidden === true}
                      onChange={(e) => setHomeCms({ ...homeCms, why_us_hidden: e.target.checked })}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    Hide section
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setHomeCms({
                        ...homeCms,
                        why_us_items: [
                          ...(homeCms.why_us_items || []),
                          { icon: "shield", title: "New Reason", description: "Why travelers trust your agency." },
                        ],
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                  >
                    + Add Card
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.why_us_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, why_us_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.why_us_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, why_us_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.why_us_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, why_us_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              {/* Cards List */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {(homeCms.why_us_items || []).map((card, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2.5 relative">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={card.icon || "shield"}
                        onChange={(e) => {
                          const updated = [...(homeCms.why_us_items || [])];
                          updated[idx] = { ...updated[idx], icon: e.target.value };
                          setHomeCms({ ...homeCms, why_us_items: updated });
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="users">Icon: Users (Local hosts)</option>
                        <option value="receipt">Icon: Receipt (Flexible payment)</option>
                        <option value="ticket">Icon: Ticket (Zero-friction booking)</option>
                        <option value="support">Icon: Support (24/7 human support)</option>
                        <option value="shield">Icon: Shield (Money security)</option>
                        <option value="heart">Icon: Heart (Hospitality)</option>
                        <option value="sparkle">Icon: Sparkle (Special experience)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (homeCms.why_us_items || []).filter((_, i) => i !== idx);
                          setHomeCms({ ...homeCms, why_us_items: updated });
                        }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={card.title}
                      onChange={(e) => {
                        const updated = [...(homeCms.why_us_items || [])];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        setHomeCms({ ...homeCms, why_us_items: updated });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      placeholder="Card Title"
                    />
                    <textarea
                      rows={2}
                      value={card.description}
                      onChange={(e) => {
                        const updated = [...(homeCms.why_us_items || [])];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setHomeCms({ ...homeCms, why_us_items: updated });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-emerald-600"
                      placeholder="Card Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. SERVICES SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">5. Services Section</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Control trip service categories and custom tour solutions</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homeCms.services_hidden === true}
                      onChange={(e) => setHomeCms({ ...homeCms, services_hidden: e.target.checked })}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    Hide section
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setHomeCms({
                        ...homeCms,
                        services_items: [
                          ...(homeCms.services_items || []),
                          { icon: "users", title: "New Tour Service", description: "Details of this tour service category." },
                        ],
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                  >
                    + Add Service
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.services_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, services_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.services_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, services_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.services_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, services_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              {/* Service Cards List */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                {(homeCms.services_items || []).map((srv, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2.5 relative">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={srv.icon || "users"}
                        onChange={(e) => {
                          const updated = [...(homeCms.services_items || [])];
                          updated[idx] = { ...updated[idx], icon: e.target.value };
                          setHomeCms({ ...homeCms, services_items: updated });
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="users">Icon: Users (Group tours)</option>
                        <option value="route">Icon: Route (Private trips)</option>
                        <option value="heart">Icon: Heart (Honeymoon)</option>
                        <option value="home">Icon: Home (Family holidays)</option>
                        <option value="briefcase">Icon: Briefcase (Corporate)</option>
                        <option value="mountain">Icon: Mountain (Trekking / Adventure)</option>
                        <option value="compass">Icon: Compass (Exploration)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (homeCms.services_items || []).filter((_, i) => i !== idx);
                          setHomeCms({ ...homeCms, services_items: updated });
                        }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={srv.title}
                      onChange={(e) => {
                        const updated = [...(homeCms.services_items || [])];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        setHomeCms({ ...homeCms, services_items: updated });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      placeholder="Service Title"
                    />
                    <textarea
                      rows={2}
                      value={srv.description}
                      onChange={(e) => {
                        const updated = [...(homeCms.services_items || [])];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setHomeCms({ ...homeCms, services_items: updated });
                      }}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-emerald-600"
                      placeholder="Service Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 6. SPECIAL OFFERS SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">6. Special Offers Banner Section</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.offers_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, offers_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide this section on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.offers_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, offers_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.offers_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, offers_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.offers_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, offers_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>
            </div>

            {/* 7. CUSTOMER REVIEWS SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">7. Customer Reviews & Testimonials</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.reviews_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, reviews_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide this section on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.reviews_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, reviews_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.reviews_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, reviews_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.reviews_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, reviews_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>
            </div>

            {/* 8. TRAVEL JOURNAL SECTION */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">8. Travel Journal & Stories Preview</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.journal_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, journal_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide this section on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.journal_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, journal_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={homeCms.journal_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, journal_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Section Description
                <textarea
                  rows={2}
                  value={homeCms.journal_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, journal_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button Label
                  <input
                    value={homeCms.journal_cta_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, journal_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Action Button URL
                  <input
                    value={homeCms.journal_cta_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, journal_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* 9. BOTTOM CTA BANNER */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">9. Bottom Call-To-Action Banner</h3>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeCms.cta_hidden === true}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_hidden: e.target.checked })}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Hide banner on homepage
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Eyebrow Badge Text
                  <input
                    value={homeCms.cta_eyebrow ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Banner Headline
                  <input
                    value={homeCms.cta_title ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Banner Description
                <textarea
                  rows={2}
                  value={homeCms.cta_description ?? ""}
                  onChange={(e) => setHomeCms({ ...homeCms, cta_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Primary Button Label
                  <input
                    value={homeCms.cta_primary_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_primary_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Primary Button URL
                  <input
                    value={homeCms.cta_primary_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_primary_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Secondary Button Label
                  <input
                    value={homeCms.cta_secondary_label ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_secondary_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Secondary Button URL
                  <input
                    value={homeCms.cta_secondary_href ?? ""}
                    onChange={(e) => setHomeCms({ ...homeCms, cta_secondary_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* Bottom sticky publish button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveCms}
                className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-md"
              >
                {dict.cms.saveChanges}
              </button>
            </div>
          </div>
        )}

        {/* ================= ABOUT PAGE CMS TAB ================= */}
        {activeTab === "about_cms" && (
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.aboutCms.title}</h2>
                <p className="text-sm text-slate-500">
                  {dict.aboutCms.subtitle}
                </p>
              </div>
              <button
                onClick={handleSaveAboutCms}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
              >
                {dict.aboutCms.saveChanges}
              </button>
            </div>

            {/* 1. Hero & Mission Section */}
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">1. Hero & Story Narrative</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Hero Eyebrow Badge
                  <input
                    value={aboutCms.hero_eyebrow || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, hero_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Hero Headline Title
                  <input
                    value={aboutCms.hero_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, hero_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Hero Subtitle
                <textarea
                  rows={2}
                  value={aboutCms.hero_subtitle || ""}
                  onChange={(e) => setAboutCms({ ...aboutCms, hero_subtitle: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Story Badge Label
                  <input
                    value={aboutCms.story_badge || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, story_badge: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Story Section Title
                  <input
                    value={aboutCms.story_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, story_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Story Paragraphs (Separate each paragraph with a blank line)
                <textarea
                  rows={6}
                  value={(aboutCms.story_paragraphs || []).join("\n\n")}
                  onChange={(e) =>
                    setAboutCms({
                      ...aboutCms,
                      story_paragraphs: e.target.value.split("\n\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Mission Statement Title
                  <input
                    value={aboutCms.mission_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, mission_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                  Mission Statement Copy
                  <textarea
                    rows={2}
                    value={aboutCms.mission_text || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, mission_text: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>
            </div>

            {/* 2. Core Values Section */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2. Core Values</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Edit, add, or remove company values showcased in the grid</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAboutCms({
                      ...aboutCms,
                      values: [
                        ...(aboutCms.values || []),
                        { icon: "sparkle", title: "New Value", description: "Value description goes here." },
                      ],
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  + Add Value
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(aboutCms.values || []).map((val, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2.5 relative">
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={val.icon || "sparkle"}
                        onChange={(e) => {
                          const updated = [...(aboutCms.values || [])];
                          updated[idx] = { ...updated[idx], icon: e.target.value };
                          setAboutCms({ ...aboutCms, values: updated });
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="shield">Icon: Shield (Security / Transparency)</option>
                        <option value="users">Icon: Users (Local People / Guides)</option>
                        <option value="heart">Icon: Heart (Hospitality / Care)</option>
                        <option value="sparkle">Icon: Sparkle (Considered Detail)</option>
                        <option value="compass">Icon: Compass (Exploration)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (aboutCms.values || []).filter((_, i) => i !== idx);
                          setAboutCms({ ...aboutCms, values: updated });
                        }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={val.title}
                      onChange={(e) => {
                        const updated = [...(aboutCms.values || [])];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        setAboutCms({ ...aboutCms, values: updated });
                      }}
                      placeholder="Value title"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    />
                    <textarea
                      rows={2}
                      value={val.description}
                      onChange={(e) => {
                        const updated = [...(aboutCms.values || [])];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setAboutCms({ ...aboutCms, values: updated });
                      }}
                      placeholder="Value description"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Team & Local Hosts Section */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">3. Team & Local Hosts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Founders, tour leaders, and on-ground hosts</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAboutCms({
                      ...aboutCms,
                      team: [
                        ...(aboutCms.team || []),
                        {
                          name: "Host Name",
                          role: "Lead Guide",
                          bio: "Experienced storyteller and expedition leader.",
                          scene: "sajek",
                        },
                      ],
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  + Add Host / Team Member
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Section Eyebrow
                  <input
                    value={aboutCms.team_eyebrow || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, team_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Section Title
                  <input
                    value={aboutCms.team_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, team_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {(aboutCms.team || []).map((member, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2 relative flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Member #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (aboutCms.team || []).filter((_, i) => i !== idx);
                            setAboutCms({ ...aboutCms, team: updated });
                          }}
                          className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        value={member.name}
                        onChange={(e) => {
                          const updated = [...(aboutCms.team || [])];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setAboutCms({ ...aboutCms, team: updated });
                        }}
                        placeholder="Full Name"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                      />
                      <input
                        value={member.role}
                        onChange={(e) => {
                          const updated = [...(aboutCms.team || [])];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          setAboutCms({ ...aboutCms, team: updated });
                        }}
                        placeholder="Role / Title"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-emerald-600"
                      />
                      <div className="space-y-1">
                        <input
                          value={member.image_url || ""}
                          onChange={(e) => {
                            const updated = [...(aboutCms.team || [])];
                            updated[idx] = { ...updated[idx], image_url: e.target.value };
                            setAboutCms({ ...aboutCms, team: updated });
                          }}
                          placeholder="Google Drive link or any image URL"
                          className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 outline-none focus:border-emerald-600"
                        />
                        {member.image_url && (
                          <div className="flex items-center gap-2 rounded bg-slate-100 p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={normalizeImageUrl(member.image_url)}
                              alt="Preview"
                              className="h-7 w-7 rounded-full object-cover border border-slate-300 shrink-0"
                            />
                            <span className="text-[10px] text-slate-500 truncate">
                              {member.image_url.includes("drive.google.com") ? "Google Drive ✓" : "Direct URL ✓"}
                            </span>
                          </div>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={member.bio}
                        onChange={(e) => {
                          const updated = [...(aboutCms.team || [])];
                          updated[idx] = { ...updated[idx], bio: e.target.value };
                          setAboutCms({ ...aboutCms, team: updated });
                        }}
                        placeholder="Brief bio"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Payment & Settlement Explainer */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">4. Payment & Settlement Section</h3>
                <p className="text-xs text-slate-400 mt-0.5">Explains the transparent partial advance and on-tour balance settlement</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Badge Label
                  <input
                    value={aboutCms.payment_badge || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, payment_badge: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Headline Title
                  <input
                    value={aboutCms.payment_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, payment_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                Detailed Explainer Text
                <textarea
                  rows={4}
                  value={aboutCms.payment_description || ""}
                  onChange={(e) => setAboutCms({ ...aboutCms, payment_description: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Button Label
                  <input
                    value={aboutCms.payment_cta_label || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, payment_cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Button Target Link
                  <input
                    value={aboutCms.payment_cta_href || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, payment_cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>
            </div>

            {/* 5. Bottom Call-To-Action Banner */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">5. Bottom CTA Banner</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Banner Title
                  <input
                    value={aboutCms.cta_title || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, cta_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Button Label
                  <input
                    value={aboutCms.cta_label || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, cta_label: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Banner Description
                  <textarea
                    rows={2}
                    value={aboutCms.cta_description || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, cta_description: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  Button Destination URL
                  <input
                    value={aboutCms.cta_href || ""}
                    onChange={(e) => setAboutCms({ ...aboutCms, cta_href: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleSaveAboutCms}
                  className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {dict.aboutCms.saveChanges}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= BLOG TAB ================= */}
        {activeTab === "blog" && (
          <div className="space-y-6 max-w-5xl">
            {/* Journal Page Header & Settings CMS Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{isBn ? "ভ্রমণ জার্নাল পেজ হেডার ও সেটিংস" : "Travel Journal Page Header & Settings"}</h3>
                  <p className="text-xs text-slate-500">{isBn ? "/journal পেজের শীর্ষ হেডিং, বিবরণ ও এম্পটি স্টেট টেক্সট পরিবর্তন করুন" : "Customize the top headline, description, and empty state text shown on /journal"}</p>
                </div>
                <button
                  onClick={handleSaveJournalCms}
                  className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                >
                  {isBn ? "জার্নাল সেটিংস সংরক্ষণ করুন" : "Save Journal Settings"}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "পেজ আইব্রো" : "Page Eyebrow"}
                  <input
                    value={journalCms.header_eyebrow || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, header_eyebrow: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "পেজ মূল শিরোনাম" : "Page Headline Title"}
                  <input
                    value={journalCms.header_title || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, header_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "সাবটাইটেল / বিবরণ" : "Editorial Subtitle / Description"}
                  <textarea
                    rows={2}
                    value={journalCms.header_description || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, header_description: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "ফিচার্ড স্টোরি ব্যাজ" : "Featured Story Badge"}
                  <input
                    value={journalCms.featured_badge || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, featured_badge: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "এম্পটি স্টেট টাইটেল" : "Empty State Title"}
                  <input
                    value={journalCms.empty_title || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, empty_title: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                  {isBn ? "এম্পটি স্টেট বিবরণ" : "Empty State Description"}
                  <input
                    value={journalCms.empty_description || ""}
                    onChange={(e) => setJournalCms({ ...journalCms, empty_description: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                  />
                </label>
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{dict.blog.title} ({num(blogPosts.length)})</h2>
                  <p className="text-xs text-slate-500">{dict.blog.subtitle}</p>
                </div>
                <button
                  onClick={() => setBlogModal({ isOpen: true, post: null })}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                >
                  {dict.blog.newPost}
                </button>
              </div>

              <div className="space-y-3">
                {blogPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    {isBn ? "এখনো কোনো আর্টিকেল তৈরি হয়নি। প্রথম ভ্রমণ গল্প লিখতে উপরের '+ নতুন আর্টিকেল' বাটনে ক্লিক করুন।" : "No articles written yet. Click \"+ Write Article\" above to publish your first story."}
                  </div>
                ) : (
                  blogPosts.map((p) => {
                    const isPublished = p.status === "published" || p.is_published === true;
                    const isFeatured = p.is_featured === true;

                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition"
                      >
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                              {p.category?.name || "Travel"}
                            </span>
                            {isFeatured && (
                              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                                {isBn ? "★ ফিচার্ড গল্প" : "★ Featured Story"}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                                isPublished
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isPublished ? dict.blog.published : dict.blog.draft}
                            </span>
                          </div>
                          <h3 className="font-semibold text-base text-slate-900">{p.title}</h3>
                          {p.excerpt && (
                            <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                              {p.excerpt}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            Slug: <span className="font-mono text-slate-600">/{p.slug}</span> · Author: {p.author_name || p.author} · {num(p.read_time_minutes || 5)} {isBn ? "মিনিট পাঠ" : "min read"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleBlogFeatured(p)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                              isFeatured
                                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                            title={isFeatured ? "Unmark from featured" : "Mark as featured story"}
                          >
                            {isFeatured ? (isBn ? "★ ফিচার্ড" : "★ Featured") : (isBn ? "☆ ফিচার্ড করুন" : "☆ Make Featured")}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlogStatus(p)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                              isPublished
                                ? "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {isPublished ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            onClick={() => setBlogModal({ isOpen: true, post: p })}
                            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteBlog(p.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3.5 py-1.5 text-xs font-medium hover:bg-rose-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= OFFERS TAB ================= */}
        {activeTab === "offers" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.offers.title}</h2>
                <p className="text-sm text-slate-500">{dict.offers.subtitle}</p>
              </div>
              <button
                onClick={() => setOfferModal({ isOpen: true, offer: null })}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
              >
                {dict.offers.addOffer}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                        {o.code || o.slug}
                      </span>
                      {o.tour_id || o.tour_slug ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800" title={o.tour_title || o.tour_slug || ""}>
                          🎯 {isBn ? "নির্দিষ্ট ট্যুর:" : "Fixed:"} {o.tour_title || o.tour_slug}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                          🌐 {isBn ? "সকল ট্যুর" : "All Tours"}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-slate-900 mt-3">{o.title}</h3>
                    <p className="text-sm text-slate-600 mt-2">{o.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {isBn ? "ছাড়:" : "Discount:"} {o.discount_type === "percent" ? `${num(o.discount_value ?? 0)}%` : `৳${num(o.discount_value ?? 0)}`}
                      </span>
                      <span>
                        {isBn ? "মেয়াদ:" : "Valid until:"} {o.valid_until ? (isBn ? toBengaliNumber(o.valid_until.slice(0, 10)) : o.valid_until.slice(0, 10)) : (isBn ? "উন্মুক্ত" : "Open")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setOfferModal({ isOpen: true, offer: o })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      {dict.common.edit}
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(o.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-medium hover:bg-rose-100 transition"
                    >
                      {dict.common.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= REVIEWS TAB ================= */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.reviews.title}</h2>
                <p className="text-sm text-slate-500">{dict.reviews.subtitle}</p>
              </div>
              <button
                onClick={() => setReviewModal({ isOpen: true, review: null })}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
              >
                {dict.reviews.addReview}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
                  <div>
                    <div className="text-amber-500 text-sm mb-2">{"★".repeat(r.rating || 5)}</div>
                    <p className="text-sm text-slate-700 italic">&ldquo;{r.quote}&rdquo;</p>
                    <p className="text-xs font-semibold text-slate-900 mt-3">{r.author_name || r.customer_name}</p>
                    <p className="text-xs text-slate-500">{r.trip_name || r.tour_title || r.author_location}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setReviewModal({ isOpen: true, review: r })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      {dict.common.edit}
                    </button>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-medium hover:bg-rose-100 transition"
                    >
                      {dict.common.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= BOOKINGS TAB ================= */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{dict.bookings.title}</h2>
              <p className="text-sm text-slate-500">
                {dict.bookings.subtitle}
              </p>
            </div>

            {/* Filter Criteria Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-sky-600 text-sm">🔍</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">{isBn ? "ফিল্টার ক্রাইটেরিয়া" : "Filter Criteria"}</span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-100/80">
                    {num(filteredBookings.length)} {isBn ? "টি ফলাফল পাওয়া গেছে" : (filteredBookings.length === 1 ? "RESULT MATCHING" : "RESULTS MATCHING")}
                  </span>
                </div>
                {(bookingDestFilter !== "all" ||
                  bookingTourFilter !== "all" ||
                  bookingDepartureFilter !== "all" ||
                  bookingStatusFilter !== "all" ||
                  bookingDateFrom ||
                  bookingDateTo ||
                  bookingSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBookingDestFilter("all");
                      setBookingTourFilter("all");
                      setBookingDepartureFilter("all");
                      setBookingStatusFilter("all");
                      setBookingDateFrom("");
                      setBookingDateTo("");
                      setBookingSearch("");
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    {isBn ? "ফিল্টার রিসেট" : "Reset Filters"}
                  </button>
                )}
              </div>

              {/* Row 1: Destination, Tour Package, Departure Date, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "গন্তব্য" : "Destination"}</label>
                  <select
                    value={bookingDestFilter}
                    onChange={(e) => {
                      setBookingDestFilter(e.target.value);
                      setBookingTourFilter("all");
                      setBookingDepartureFilter("all");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  >
                    <option value="all">{isBn ? `সকল গন্তব্য (${num(destinations.length)})` : `All Destinations (${destinations.length})`}</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.slug}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "ট্যুর প্যাকেজ" : "Tour Package"}</label>
                  <select
                    value={bookingTourFilter}
                    onChange={(e) => {
                      setBookingTourFilter(e.target.value);
                      setBookingDepartureFilter("all");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  >
                    <option value="all">{isBn ? `সকল ট্যুর (${num(availableBookingTours.length)})` : `All Tours (${availableBookingTours.length})`}</option>
                    {availableBookingTours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "ডিপার্চার তারিখ" : "Departure Date"}</label>
                  <select
                    value={bookingDepartureFilter}
                    onChange={(e) => {
                      setBookingDepartureFilter(e.target.value);
                      setBookingDateFrom("");
                      setBookingDateTo("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  >
                    <option value="all">{isBn ? `সকল ডিপার্চার (${num(departureDatesList.length)} টি তারিখ)` : `All Departures (${departureDatesList.length} dates)`}</option>
                    {departureDatesList.map((d) => (
                      <option key={d} value={d}>
                        {formatBookingDepartureDate(d)} ({d})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "স্ট্যাটাস" : "Status"}</label>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  >
                    <option value="all">{dict.bookings.filterAll}</option>
                    <option value="confirmed_any">{isBn ? "নিশ্চিত (অগ্রিম ও পূর্ণ পরিশোধ)" : "Confirmed (Advance & Full)"}</option>
                    <option value="confirmed_advance_paid">{isBn ? "অগ্রিম পরিশোধিত" : "Advance Paid"}</option>
                    <option value="confirmed_fully_paid">{isBn ? "সম্পূর্ণ পরিশোধিত" : "Fully Paid"}</option>
                    <option value="cleared_on_tour_day">{isBn ? "ট্যুরের দিনে পরিশোধিত" : "Cleared On Tour Day"}</option>
                    <option value="pending_cash_approval">{isBn ? "ক্যাশ অনুমোদন বাকি (১০ মিনিট)" : "Pending Cash Approval (10m)"}</option>
                    <option value="pending_verification">{isBn ? "রকেট যাচাই বাকি (১৫ মিনিট)" : "Pending Rocket Verification (15m)"}</option>
                    <option value="pending_payment">{isBn ? "পেমেন্ট বাকি" : "Pending Payment"}</option>
                    <option value="cancelled">{dict.bookings.filterCancelled}</option>
                    <option value="refunded">{isBn ? "রিফান্ডকৃত" : "Refunded"}</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date Range: From, Date Range: To, Search Passenger, Seat or Ref */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "তারিখ হতে" : "Date Range: From"}</label>
                  <input
                    type="date"
                    value={bookingDateFrom}
                    onChange={(e) => {
                      setBookingDateFrom(e.target.value);
                      setBookingDepartureFilter("all");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "তারিখ পর্যন্ত" : "Date Range: To"}</label>
                  <input
                    type="date"
                    value={bookingDateTo}
                    onChange={(e) => {
                      setBookingDateTo(e.target.value);
                      setBookingDepartureFilter("all");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{isBn ? "ভ্রমণকারী, আসন, রেফারেন্স বা ট্রানজ্যাকশন আইডি খুঁজুন" : "Search Passenger, Seat, Ref or TrxID"}</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={dict.bookings.searchPlaceholder}
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs pr-8"
                    />
                    {bookingSearch && (
                      <button
                        type="button"
                        onClick={() => setBookingSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Urgency Alert for Pending Cash Bookings */}
            {bookings.filter((b) => b.status === "pending_cash_approval").length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">⏳</span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                      {num(bookings.filter((b) => b.status === "pending_cash_approval").length)} {isBn ? "টি ফিজিক্যাল ক্যাশ বুকিং অনুমোদন অপেক্ষমান" : "Physical Cash Booking(s) Awaiting Approval"}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                      {isBn ? "১০ মিনিটের মধ্যে ক্যাশ গ্রহণ নিশ্চিত করুন যাতে সিট বুকিং বজায় থাকে।" : "10-minute security auto-cancellation is active. Approve received cash before the deadline to confirm reservations and seats."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter("pending_cash_approval")}
                  className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  {isBn ? "ক্যাশ বুকিং দেখুন" : "View Cash Bookings"}
                </button>
              </div>
            )}

            {/* Urgency Alert for Pending Rocket Verification */}
            {bookings.filter((b) => b.status === "pending_verification").length > 0 && (
              <div className="rounded-xl border border-purple-300 bg-purple-50/90 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    🚀
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                      {num(bookings.filter((b) => b.status === "pending_verification").length)} {isBn ? "টি রকেট অনলাইন যাচাই বাকি" : "Rocket Payment(s) Awaiting Automated SMS Match or Approval"}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-purple-800 mt-0.5">
                      {isBn ? "১৫ মিনিটের অটো-রিলিজ টাইমার চালু আছে। এসএমএস এলে স্বয়ংক্রিয়ভাবে নিশ্চিত হবে, অথবা ম্যানুয়ালি অনুমোদন/বাতিল করুন।" : "15-minute auto-release timer is active. System will auto-confirm on matching SMS, or approve/reject manually."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter("pending_verification")}
                  className="rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  {isBn ? "রকেট বুকিং দেখুন" : "View Rocket Bookings"}
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">{dict.bookings.colRef}</th>
                    <th className="px-4 py-3">{dict.bookings.colTraveler}</th>
                    <th className="px-4 py-3">{dict.bookings.colTour}</th>
                    <th className="px-4 py-3">{isBn ? "পিক-আপ ও আসন" : "Pick-up & Seats"}</th>
                    <th className="px-4 py-3">{isBn ? "পরিশোধ / মোট / বাকি" : "Paid / Total / Due"}</th>
                    <th className="px-4 py-3">{isBn ? "স্ট্যাটাস ও ক্যাশ অনুমোদন" : "Status & Cash Approval"}</th>
                    <th className="px-4 py-3 text-right">{isBn ? "পাস / ভাউচার" : "Pass"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                        No customer reservations found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className={`hover:bg-slate-50/70 transition ${b.status === "pending_cash_approval" ? "bg-amber-50/40" : b.status === "pending_verification" ? "bg-purple-50/40" : ""}`}>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          <div className="font-bold">{b.reference}</div>
                          <div className="mt-1 flex flex-col gap-1 text-[10px]">
                            {/* Advance Payment Method */}
                            <div className="space-y-0.5">
                              {b.advance_payment_method === "cash_on_hand" || b.payment_method === "cash_on_hand" || b.payment_method === "cash" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 font-bold" title="Advance paid via Hand Cash">
                                  💵 Adv: Hand Cash
                                </span>
                              ) : b.advance_payment_method === "Rocket payment" || b.payment_method === "Rocket payment" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-950 border border-purple-300 px-1.5 py-0.5 font-semibold" title="Advance paid via Rocket payment">
                                  🚀 Adv: Rocket payment
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-pink-50 text-pink-950 border border-pink-200 px-1.5 py-0.5 font-semibold" title="Advance paid via Bkash payment">
                                  📱 Adv: Bkash payment
                                </span>
                              )}
                              {(b.advance_transaction_id || b.transaction_id) && (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="font-mono text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 select-all cursor-pointer hover:bg-slate-200 transition tracking-tight"
                                    title="Click/select to copy Transaction ID"
                                  >
                                    <span className="text-slate-400 font-semibold font-sans">Trx:</span> {b.advance_transaction_id || b.transaction_id}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Due Payment Method */}
                            <div className="space-y-0.5">
                              {b.due_payment_method === "cash_on_hand" ? (
                                <span
                                   className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold border ${
                                    Number(b.amount_due) <= 0
                                      ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                      : "bg-amber-100 text-amber-950 border-amber-300"
                                  }`}
                                  title="Due: Hand Cash to Tour Host"
                                >
                                  💵 Due: Hand Cash {Number(b.amount_due) <= 0 ? "✓" : "⏳"}
                                </span>
                              ) : b.due_payment_method === "Rocket payment" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-950 border border-purple-300 px-1.5 py-0.5 font-semibold" title="Due: Rocket payment">
                                  🚀 Due: Rocket payment ✓
                                </span>
                              ) : b.due_payment_method && b.due_payment_method !== "cash_on_hand" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-pink-50 text-pink-900 border border-pink-200 px-1.5 py-0.5 font-semibold" title="Due: Bkash payment">
                                  📱 Due: Bkash payment ✓
                                </span>
                              ) : Number(b.amount_due) > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 font-medium" title="Due: Pending Selection">
                                  ⏳ Due: Unpaid
                                </span>
                              ) : null}
                              {b.due_transaction_id && b.due_transaction_id !== (b.advance_transaction_id || b.transaction_id) && (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="font-mono text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 select-all cursor-pointer hover:bg-slate-200 transition tracking-tight"
                                    title="Due Settlement Transaction ID"
                                  >
                                    <span className="text-slate-400 font-semibold font-sans">Due Trx:</span> {b.due_transaction_id}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{b.customer_full_name}</div>
                          <div className="text-xs text-slate-500">{b.customer_phone_number}</div>
                          <div className="text-[11px] text-slate-400">{b.customer_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{b.tour_title}</div>
                          <div className="text-xs text-slate-500">
                            {b.traveler_count} traveler(s) · {b.departure_date ? b.departure_date.slice(0, 10) : "Open"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boarding Pick-up</div>
                              {b.pickup_point ? (
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 border border-amber-200 shadow-2xs">
                                  <span className="text-amber-600">📍</span> {b.pickup_point}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 italic">
                                  Not selected
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Seats</div>
                              {b.selected_seats && b.selected_seats.length > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                  💺 {b.selected_seats.join(", ")}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Unassigned ({b.traveler_count || 1} pax)</span>
                              )}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePickupPoint(b.id, b.reference, b.pickup_point)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                                title="Change or assign pick-up boarding point"
                              >
                                <span>✏️</span> {isBn ? "পিক-আপ পরিবর্তন" : "Edit Pick-up"}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-emerald-800">{bdt(b.amount_paid)} {isBn ? "পরিশোধিত" : "paid"}</div>
                          <div className="text-xs text-slate-500">{isBn ? "মোট:" : "Total:"} {bdt(b.total_price)}</div>
                          {(b.promo_code || (b.special_requests && b.special_requests.includes("[Promo: "))) && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-200">
                              <span>🎟️</span>
                              <span>{b.promo_code || b.special_requests?.match(/\[Promo:\s*([A-Za-z0-9_\-]+)/)?.[1]}</span>
                              {(b.discount_amount || b.special_requests?.match(/\[Promo:\s*[A-Za-z0-9_\-]+\s*\(-৳?([0-9,.]+)\)\]/)?.[1]) && (
                                <span className="text-amber-700 font-normal">
                                  (-{bdt(b.discount_amount || b.special_requests?.match(/\[Promo:\s*[A-Za-z0-9_\-]+\s*\(-৳?([0-9,.]+)\)\]/)?.[1] || 0)})
                                </span>
                              )}
                            </div>
                          )}
                          {Number(b.amount_due) > 0 && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-xs text-rose-700 font-medium">{isBn ? "বাকি:" : "Due:"} {bdt(b.amount_due)}</span>
                              <button
                                type="button"
                                onClick={() => handleSettleDue(b.id, b.reference, b.amount_due)}
                                className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                                title="Settle and complete remaining due payment"
                              >
                                ✓ {dict.bookings.settleDue}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <select
                              value={b.status}
                              onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                            >
                              <option value="pending_cash_approval">{isBn ? "ক্যাশ অনুমোদন বাকি" : "Pending Cash Approval (10m)"}</option>
                              <option value="pending_verification">{isBn ? "রকেট যাচাই বাকি" : "Pending Rocket Verification (15m)"}</option>
                              <option value="confirmed_advance_paid">{isBn ? "অগ্রিম পরিশোধিত" : "Advance Paid"}</option>
                              <option value="confirmed_fully_paid">{isBn ? "সম্পূর্ণ পরিশোধিত" : "Fully Paid"}</option>
                              <option value="confirmed">{isBn ? "নিশ্চিত" : "Confirmed"}</option>
                              <option value="pending_payment">{isBn ? "পেমেন্ট বাকি" : "Pending Payment"}</option>
                              <option value="cleared_on_tour_day">{isBn ? "ট্যুরের দিনে পরিশোধিত" : "Cleared On Tour Day"}</option>
                              <option value="completed">{isBn ? "সম্পন্ন" : "Completed"}</option>
                              <option value="cancelled">{isBn ? "বাতিল" : "Cancelled"}</option>
                            </select>

                            {/* Pending Rocket Online Verification 15-Minute Timer & Quick Actions */}
                            {b.status === "pending_verification" && (
                              <div className="rounded-lg border border-purple-300 bg-purple-50 p-2 space-y-1.5 shadow-2xs">
                                <div className="text-[11px] font-bold text-purple-950 flex items-center justify-between">
                                  <span>🚀 {isBn ? "রকেট যাচাই বাকি" : "Rocket Verification"}</span>
                                  <span className="font-mono text-purple-900 font-extrabold">{bdt(b.advance_amount || b.amount_paid || b.total_price)}</span>
                                </div>
                                <div className="text-[10px] space-y-0.5 font-mono text-slate-700 bg-white/80 p-1.5 rounded border border-purple-200">
                                  <div><span className="font-semibold text-slate-500">TrxID:</span> <span className="font-bold text-purple-950">{b.submitted_trx_id || b.advance_transaction_id || b.transaction_id || "N/A"}</span></div>
                                  {b.submitted_sender_phone && (
                                    <div><span className="font-semibold text-slate-500">Sender:</span> {b.submitted_sender_phone}</div>
                                  )}
                                </div>
                                <div>
                                  <AdminRocketCountdown
                                    expiresAt={b.verification_expires_at}
                                    onExpire={() => loadData()}
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveRocketPayment(b.id, b.reference, b.submitted_trx_id || b.advance_transaction_id || b.transaction_id)}
                                    className="rounded bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Manually approve Rocket payment and confirm seats"
                                  >
                                    ✓ {isBn ? "অনুমোদন করুন" : "Approve Payment"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectRocketPayment(b.id, b.reference, b.submitted_trx_id || b.advance_transaction_id || b.transaction_id)}
                                    className="rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Reject fake/unpaid Rocket TrxID and instantly release seats"
                                  >
                                    ✕ {isBn ? "বাতিল ও সিট মুক্ত" : "Reject & Release Seats"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Pending Cash Approval 10-Minute Timer & Quick Actions */}
                            {b.status === "pending_cash_approval" && (
                              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1.5">
                                <div>
                                  <AdminCashCountdown
                                    expiresAt={b.cash_approval_expires_at}
                                    onExpire={() => loadData()}
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveCashPayment(b.id, b.reference, "advance")}
                                    className="rounded bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Approve advance deposit received in cash"
                                  >
                                    ✓ {isBn ? "অগ্রিম অনুমোদন" : "Approve Advance"} ({bdt(b.advance_amount)})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveCashPayment(b.id, b.reference, "full")}
                                    className="rounded bg-emerald-900 hover:bg-emerald-950 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Approve full price received in cash"
                                  >
                                    ✓ {isBn ? "পূর্ণ অনুমোদন" : "Approve Full"} ({bdt(b.total_price)})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectCashPayment(b.id, b.reference)}
                                    className="rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Reject cash reservation and release seats"
                                  >
                                    ✕ {isBn ? "বাতিল" : "Reject"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Pending Due Cash Approval Card */}
                            {Number(b.amount_due) > 0 && b.due_payment_method === "cash_on_hand" && b.status !== "pending_cash_approval" && (
                              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1.5 shadow-2xs">
                                <div className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                                  <span>💵 {isBn ? "বাকি ক্যাশ অনুরোধ" : "Due Cash Requested"}</span>
                                  <span className="font-mono text-emerald-900 font-extrabold">{bdt(b.amount_due)}</span>
                                </div>
                                <p className="text-[10px] text-amber-800 leading-tight">
                                  {isBn ? "গ্রাহক ট্যুর হোস্টের কাছে বাকি অর্থ ক্যাশ হিসেবে পরিশোধ করতে চেয়েছেন।" : "Customer selected to pay remaining balance in cash to Tour Host."}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveCashPayment(b.id, b.reference, "due")}
                                    className="rounded bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Approve due balance received in physical cash"
                                  >
                                    ✓ {isBn ? "বাকি ক্যাশ অনুমোদন" : "Approve Due Cash"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectCashPayment(b.id, b.reference, "due")}
                                    className="rounded bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                    title="Reject due cash"
                                  >
                                    ✕ {isBn ? "বাতিল" : "Reject"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {b.verified_by_sms_id && (
                              <div className="text-[11px] text-purple-900 font-semibold flex items-center gap-1">
                                <span>⚡ Auto-verified by DBBL Rocket SMS</span>
                              </div>
                            )}
                            {b.cash_approved_by && (
                              <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                <span>✓ Advance cash verified by {b.cash_approved_by}</span>
                              </div>
                            )}
                            {b.due_cash_approved_by && (
                              <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                <span>✓ Due cash verified by {b.due_cash_approved_by}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/clearance/${b.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                          >
                            Pass ↗
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= REPORTS & MANIFEST TAB ================= */}
        {activeTab === "reports" && (
          <TourReportManager
            bookings={bookings}
            tours={tours}
            destinations={destinations}
            customers={customers}
            currentUser={user}
          />
        )}

        {/* ================= USERS / TRAVELERS TAB ================= */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.users.title}</h2>
                <p className="text-sm text-slate-500">
                  {dict.users.subtitle}
                </p>
              </div>
              <button
                onClick={() => loadData()}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>↻ {isBn ? "ডিরেক্টরি রিফ্রেশ" : "Refresh Directory"}</span>
              </button>
            </div>

            {/* Traveler Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">{isBn ? "মোট নিবন্ধিত ভ্রমণকারী" : "Total Registered Travelers"}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{num(customers.length)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">{isBn ? "বুকিংধারী ভ্রমণকারী" : "Travelers with Bookings"}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {num(customers.filter((c) => (c.bookings_count || 0) > 0).length)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">{isBn ? "সর্বমোট সম্পন্ন বুকিং" : "Total Lifetime Bookings"}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {num(customers.reduce((acc, c) => acc + (c.bookings_count || 0), 0))}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">{isBn ? "মোট সংগৃহীত অর্থ" : "Total Revenue Collected"}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {bdt(customers.reduce((acc, c) => acc + (c.total_spent || 0), 0))}
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder={dict.users.searchPlaceholder}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch("")}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {isBn ? (
                  `${num(customers.length)} জনের মধ্যে ${num(customers.filter((c) => {
                    const q = userSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                      (c.phone_number && c.phone_number.toLowerCase().includes(q)) ||
                      (c.email && c.email.toLowerCase().includes(q))
                    );
                  }).length)} জন ভ্রমণকারী দেখানো হচ্ছে`
                ) : (
                  `Showing ${customers.filter((c) => {
                    const q = userSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                      (c.phone_number && c.phone_number.toLowerCase().includes(q)) ||
                      (c.email && c.email.toLowerCase().includes(q))
                    );
                  }).length} of ${customers.length} travelers`
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">{dict.users.colName}</th>
                    <th className="px-4 py-3">{dict.users.colContact}</th>
                    <th className="px-4 py-3">{isBn ? "যোগদান / সর্বশেষ সক্রিয়" : "Joined / Last Active"}</th>
                    <th className="px-4 py-3 text-center">{dict.users.colBookings}</th>
                    <th className="px-4 py-3">{isBn ? "মোট পরিশোধ / বাকি" : "Total Paid / Due"}</th>
                    <th className="px-4 py-3">{isBn ? "সাম্প্রতিক কার্যক্রম" : "Latest Activity"}</th>
                    <th className="px-4 py-3 text-right">{dict.users.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customers.filter((c) => {
                    const q = userSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                      (c.phone_number && c.phone_number.toLowerCase().includes(q)) ||
                      (c.email && c.email.toLowerCase().includes(q))
                    );
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                        {dict.users.noUsers}
                      </td>
                    </tr>
                  ) : (
                    customers.filter((c) => {
                      const q = userSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                        (c.phone_number && c.phone_number.toLowerCase().includes(q)) ||
                        (c.email && c.email.toLowerCase().includes(q))
                      );
                    }).map((c) => {
                      const latestAct = c.activities && c.activities.length > 0 ? c.activities[0] : null;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                                {c.full_name?.charAt(0).toUpperCase() || "T"}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{c.full_name}</div>
                                <span className="font-mono text-[11px] text-slate-400">ID: {c.id.slice(0, 16)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono font-medium text-slate-900">{c.phone_number}</div>
                            <div className="text-xs text-slate-500">{c.email || (isBn ? "ইমেইল নেই" : "No email")}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-900">
                              {c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c.last_login_at ? `${isBn ? "সক্রিয়:" : "Active:"} ${new Date(c.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                              {num(c.bookings_count || 0)} {isBn ? "টি ট্যুর" : "tour(s)"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-emerald-700">{bdt(c.total_spent || 0)}</div>
                            {(c.total_due || 0) > 0 ? (
                              <div className="text-xs text-amber-700 font-medium">{isBn ? "বাকি:" : "Due:"} {bdt(c.total_due || 0)}</div>
                            ) : (
                              <div className="text-[11px] text-slate-400">{isBn ? "পরিশোধিত" : "Settled"}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {latestAct ? (
                              <div className="max-w-xs">
                                <div className="font-medium text-xs text-slate-900 truncate">{latestAct.title}</div>
                                <div className="text-[11px] text-slate-400">
                                  {new Date(latestAct.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomer(c)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition shadow-xs cursor-pointer"
                              >
                                {isBn ? "বিস্তারিত প্রোফাইল →" : "Whole Details →"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c.id, c.full_name)}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition shadow-xs cursor-pointer"
                                title={isBn ? "কাস্টমার রেকর্ড মুছুন" : "Delete traveler profile"}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Whole Details Modal / Drawer */}
            {selectedCustomer && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full my-4 sm:my-8 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-slate-100 p-3.5 sm:p-6 flex items-start justify-between gap-3 sm:gap-4 z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-bold text-lg sm:text-2xl shadow-sm shrink-0">
                        {selectedCustomer.full_name?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">{selectedCustomer.full_name}</h3>
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold">
                            Verified Traveler
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 sm:gap-x-3 text-[11px] sm:text-xs text-slate-500">
                          <span className="font-mono font-medium text-slate-700">{selectedCustomer.phone_number}</span>
                          <span>•</span>
                          <span className="truncate max-w-[140px] sm:max-w-none">{selectedCustomer.email || "No email on record"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">Joined: {new Date(selectedCustomer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        {selectedCustomer.preferred_pickup_point && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                            <span>📍 Preferred Pick-up:</span>
                            <span className="font-semibold text-slate-900">{selectedCustomer.preferred_pickup_point}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-lg p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-base font-bold shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Financial Summary Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                      <div>
                        <p className="text-[11px] sm:text-xs text-slate-500">Total Bookings</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{selectedCustomer.bookings_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs text-slate-500">Total Amount Paid</p>
                        <p className="text-base sm:text-lg font-bold text-emerald-700">{formatBDT(selectedCustomer.total_spent || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs text-slate-500">Pending Amount Due</p>
                        <p className="text-base sm:text-lg font-bold text-amber-700">{formatBDT(selectedCustomer.total_due || 0)}</p>
                      </div>
                    </div>

                    {/* SECTION 1: Booking History Details of this Customer */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                        <span>Tour Booking History ({selectedCustomer.bookings?.length || 0})</span>
                      </h4>

                      {!selectedCustomer.bookings || selectedCustomer.bookings.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                          No bookings registered under this traveler profile.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedCustomer.bookings.map((b) => (
                            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                                    {b.reference}
                                  </span>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {b.status.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <a
                                  href={`/clearance/${b.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-emerald-700 font-semibold hover:underline"
                                >
                                  View Clearance Pass ↗
                                </a>
                              </div>

                              <div className="font-semibold text-slate-900 text-sm">{b.tour_title}</div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-slate-400 block">Departure:</span>
                                  <span className="font-medium text-slate-800">{b.departure_date || "Open"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Travelers:</span>
                                  <span className="font-medium text-slate-800">
                                    {b.traveler_count} person(s)
                                    {b.selected_seats && b.selected_seats.length > 0 && (
                                      <span className="block text-[11px] text-emerald-700 font-semibold">
                                        Seats: {b.selected_seats.join(", ")}
                                      </span>
                                    )}
                                    {b.pickup_point && (
                                      <span className="block text-[11px] text-slate-600 font-medium">
                                        📍 Pick-up: {b.pickup_point}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Paid:</span>
                                  <span className="font-bold text-emerald-700">{formatBDT(b.amount_paid)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Due on Tour Day:</span>
                                  <span className="font-bold text-slate-800">{formatBDT(b.amount_due)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: Complete User Activity Timeline */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-3">Complete User Activity Timeline</h4>

                      {!selectedCustomer.activities || selectedCustomer.activities.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                          No user activities recorded.
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-4">
                          {selectedCustomer.activities.map((act) => (
                            <div key={act.id} className="relative">
                              <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-900">{act.title}</span>
                                  <span className="font-mono text-slate-400 text-[11px]">
                                    {new Date(act.created_at).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{act.description}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {Array.isArray(act.metadata?.selected_seats) && (act.metadata.selected_seats as string[]).length > 0 && (
                                    <div className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                                      Seats: {(act.metadata.selected_seats as string[]).join(", ")}
                                    </div>
                                  )}
                                  {typeof act.metadata?.pickup_point === "string" && (
                                    <div className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                                      📍 Pick-up: {act.metadata.pickup_point}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.full_name)}
                      className="rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <span>🗑️</span>
                      <span>Delete Traveler Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= INQUIRIES TAB ================= */}
        {activeTab === "inquiries" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{dict.inquiries.title}</h2>
                <p className="text-sm text-slate-500">{dict.inquiries.subtitle}</p>
              </div>
            </div>

            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm shadow-xs">
                  {isBn ? "কোনো কাস্টমার অনুসন্ধান পাওয়া যায়নি।" : "No customer inquiries registered."}
                </div>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-start justify-between gap-4 shadow-xs hover:border-slate-300 transition">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-semibold text-base text-slate-900">{inq.name}</span>
                        <span className="text-xs text-slate-500">{isBn && inq.phone ? toBengaliNumber(inq.phone) : inq.phone}</span>
                        {inq.email && <span className="text-xs text-slate-400">· {inq.email}</span>}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            inq.status === "resolved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : inq.status === "in_progress"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {inq.status === "in_progress"
                            ? (isBn ? "চলমান" : "In Progress")
                            : inq.status === "resolved"
                            ? (isBn ? "সম্পন্ন" : "Resolved")
                            : (isBn ? "নতুন" : "New")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {isBn ? "গন্তব্য:" : "Destination:"} <span className="text-slate-900">{inq.destination || (isBn ? "কাস্টম" : "Custom")}</span> · {isBn ? "ভ্রমণকারী:" : "Travelers:"} <span className="text-slate-900">{isBn && inq.travelers ? toBengaliNumber(inq.travelers) : (inq.travelers || (isBn ? "ফ্লেক্সিবল" : "Flexible"))}</span> · {isBn ? "ট্যুর:" : "Trip:"} <span className="text-slate-900">{inq.trip_type || (isBn ? "সাধারণ অনুসন্ধান" : "General Inquiry")}</span>
                      </p>
                      {inq.message && (
                        <p className="text-sm text-slate-700 mt-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                          &ldquo;{inq.message}&rdquo;
                        </p>
                      )}
                      {inq.admin_notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">
                          {isBn ? "স্টাফ নোট:" : "Staff Note:"} {inq.admin_notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setInquiryModal({ isOpen: true, inquiry: inq })}
                      className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      {isBn ? "আপডেট / ফলো-আপ" : "Update / Follow-up"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEO Management Tab */}
        {activeTab === "seo" && (
          <div className="space-y-6">
            <AdminSeoManager showNotification={showNotification} />
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}

      {/* Tour Gallery Modal (Bento Structure) */}
      {tourGalleryModal.isOpen && tourGalleryModal.tour && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full my-6 max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[11px] font-semibold tracking-wide uppercase mb-1">
                  <span>📸</span>
                  <span>{dict.modals.gallery.title}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {tourGalleryModal.tour.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn ? "এই ট্যুরের বেন্তো গ্যালারির জন্য ছবি কনফিগার করুন।" : "Configure high-resolution scenery photos for this tour's Bento gallery."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTourGalleryModal({ isOpen: false, tour: null, gallery: [], isSaving: false })}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleAddGalleryImage}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{dict.modals.gallery.addPhoto}</span>
              </button>
            </div>

            {/* Modal Body: Photos List */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {tourGalleryModal.gallery.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                  <div className="text-3xl mb-2">📸</div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isBn ? "এখনও কোনো গ্যালারি ছবি যোগ করা হয়নি" : "No Gallery Photos Added Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    {isBn ? "এই ট্যুরের গ্যালারিতে ছবি যোগ করতে নিচের বোতামে ক্লিক করুন।" : "Click the button below to add photos to this tour's gallery."}
                  </p>
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>{dict.modals.gallery.addPhoto}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tourGalleryModal.gallery.map((item, idx) => {
                    const slotNames: Record<string, string> = {
                      featured_main: "⭐ Slot 1: Tall (Left)",
                      grid_1: "🔲 Slot 2: Grid Top-Left",
                      grid_2: "🔲 Slot 3: Grid Top-Right",
                      grid_3: "🔲 Slot 4: Grid Bottom-Left",
                      grid_4: "🔲 Slot 5: Grid Bottom-Right",
                      panorama: "🏞️ Slot 6: Panorama Banner (Bottom)",
                    };

                    const currentSlot = item.slot || (idx === 0 ? "featured_main" : idx <= 4 ? `grid_${idx}` : idx === 5 ? "panorama" : "grid_1");

                    return (
                      <div
                        key={item.id || idx}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition"
                      >
                        {/* Card Top Strip */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {slotNames[currentSlot] || `Slot: ${currentSlot}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveGalleryImage(idx, "up")}
                              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Move Up"
                            >
                              ↑ Up
                            </button>
                            <button
                              type="button"
                              disabled={idx === tourGalleryModal.gallery.length - 1}
                              onClick={() => handleMoveGalleryImage(idx, "down")}
                              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Move Down"
                            >
                              ↓ Down
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(idx)}
                              className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition cursor-pointer"
                              title="Delete Photo"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Card Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                          {/* Left: Thumbnail Preview */}
                          <div className="md:col-span-3">
                            <div className="aspect-video md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center text-slate-400">
                              {item.image ? (
                                <img
                                  src={normalizeImageUrl(item.image)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-xs">No image URL</span>
                              )}
                            </div>
                          </div>

                          {/* Right: Form Controls */}
                          <div className="md:col-span-9 space-y-3">
                            {/* Image URL Input */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Image URL (Direct link / Unsplash / Google Drive) *
                              </label>
                              <input
                                type="text"
                                value={item.image}
                                onChange={(e) => handleUpdateGalleryItem(idx, "image", e.target.value)}
                                placeholder="https://images.unsplash.com/... or direct image link"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono shadow-2xs"
                              />
                            </div>

                            {/* Bento Layout Slot */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Bento Layout Slot *
                              </label>
                              <select
                                value={item.slot || currentSlot}
                                onChange={(e) => handleUpdateGalleryItem(idx, "slot", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                              >
                                <option value="featured_main">Slot 1: Tall (Left)</option>
                                <option value="grid_1">Slot 2: Grid Top-Left</option>
                                <option value="grid_2">Slot 3: Grid Top-Right</option>
                                <option value="grid_3">Slot 4: Grid Bottom-Left</option>
                                <option value="grid_4">Slot 5: Grid Bottom-Right</option>
                                <option value="panorama">Slot 6: Panorama Banner (Bottom)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                {num(tourGalleryModal.gallery.length)} {isBn ? "টি ছবি কনফিগার করা হয়েছে" : "photos configured"}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setTourGalleryModal({ isOpen: false, tour: null, gallery: [], isSaving: false })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {dict.modals.gallery.cancel}
                </button>
                <button
                  type="button"
                  disabled={tourGalleryModal.isSaving}
                  onClick={handleSaveTourGallery}
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-5 py-2 text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {tourGalleryModal.isSaving ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>{isBn ? "সংরক্ষণ করা হচ্ছে..." : "Saving Gallery..."}</span>
                    </>
                  ) : (
                    <span>{dict.modals.gallery.save}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOUR DEPARTURES & SEAT CAPACITY MODAL ================= */}
      {departuresModal.isOpen && departuresModal.tour && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full my-6 max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] font-semibold tracking-wide uppercase mb-1">
                  <span>🚌</span>
                  <span>{dict.modals.departures.title}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {departuresModal.tour.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn ? "গন্তব্য:" : "Destination:"} {departuresModal.tour.destination_name} · {isBn ? "ডিফল্ট আসন:" : "Default Capacity:"} {num(departuresModal.tour.total_seats || 40)} {isBn ? "টি" : "seats"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeparturesModal((prev) => ({ ...prev, isOpen: false, tour: null }))}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Add New Departure Box */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>➕</span>
                    <span>{isBn ? "নতুন নির্ধারিত যাত্রা যোগ করুন" : "Add New Scheduled Departure"}</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {isBn ? "তারিখ বেছে নিন ও আসন সংখ্যা নির্ধারণ করুন" : "Pick date & set seat capacity"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-12 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBn ? "যাত্রা শুরুর তারিখ" : "Departure Date (যাত্রা শুরুর তারিখ)"}
                    </label>
                    <input
                      type="date"
                      value={departuresModal.newDate}
                      onChange={(e) =>
                        setDeparturesModal((prev) => ({ ...prev, newDate: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBn ? "মোট আসন সংখ্যা" : "Seat Capacity (মোট আসন)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={departuresModal.newSeats}
                      onChange={(e) =>
                        setDeparturesModal((prev) => ({ ...prev, newSeats: e.target.value }))
                      }
                      placeholder={isBn ? "যেমন ৪০" : "e.g. 40"}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!departuresModal.newDate) {
                          showNotification("error", "Please select a departure date.");
                          return;
                        }
                        const exists = departuresModal.departures.some(
                          (d) => d.departure_date === departuresModal.newDate
                        );
                        if (exists) {
                          showNotification("error", `A departure on ${departuresModal.newDate} already exists.`);
                          return;
                        }
                        const cap = Math.max(1, Number(departuresModal.newSeats) || departuresModal.tour?.total_seats || 40);
                        const newDep: DbDeparture = {
                          id: `dep-${departuresModal.newDate}-${Date.now()}`,
                          departure_date: departuresModal.newDate,
                          total_seats: cap,
                          seats_remaining: cap,
                          booked_seats: [],
                          is_active: true,
                        };
                        setDeparturesModal((prev) => ({
                          ...prev,
                          departures: [...prev.departures, newDep].sort((a, b) =>
                            a.departure_date.localeCompare(b.departure_date)
                          ),
                          newDate: "",
                        }));
                        showNotification("success", `Added scheduled departure for ${departuresModal.newDate}.`);
                      }}
                      className="w-full rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer text-center"
                    >
                      {dict.modals.departures.addBatch}
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Departures List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {isBn ? "নির্ধারিত যাত্রাসমূহ" : "Configured Departures"} ({num(departuresModal.departures.length)})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isBn ? "লাইভ আসন বুকিং অনুযায়ী স্বয়ংক্রিয়ভাবে আপডেট হয়" : "Live seat availability dynamically tracks customer bookings"}
                  </span>
                </div>

                {departuresModal.departures.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    {isBn ? "এখনও কোনো নির্ধারিত যাত্রা কনফিগার করা হয়নি। উপরের বক্সটি ব্যবহার করুন।" : "No scheduled departures configured yet. Use the box above to schedule departure dates."}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {departuresModal.departures.map((dep, dIdx) => (
                      <div
                        key={dep.id || dIdx}
                        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition ${
                          dep.is_active !== false
                            ? "bg-white border-slate-200 hover:border-slate-300"
                            : "bg-slate-50 border-slate-200/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📅</span>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {isBn ? toBengaliNumber(dep.departure_date) : dep.departure_date}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {isBn ? "বুকড:" : "Booked:"} <strong className="text-slate-800">{num(dep.booked_seats?.length || 0)}</strong> · {isBn ? "অবশিষ্ট:" : "Remaining:"} <strong className="text-emerald-700">{num(dep.seats_remaining ?? dep.total_seats ?? 40)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                            <span>{isBn ? "আসন:" : "Capacity:"}</span>
                            <input
                              type="number"
                              min={Math.max(1, dep.booked_seats?.length || 0)}
                              value={dep.total_seats || 40}
                              onChange={(e) => {
                                const newCap = Math.max(1, Number(e.target.value) || 40);
                                const bookedCount = dep.booked_seats?.length || 0;
                                setDeparturesModal((prev) => ({
                                  ...prev,
                                  departures: prev.departures.map((d, i) =>
                                    i === dIdx
                                      ? {
                                          ...d,
                                          total_seats: newCap,
                                          seats_remaining: Math.max(0, newCap - bookedCount),
                                        }
                                      : d
                                  ),
                                }));
                              }}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono font-bold text-slate-800 text-center outline-none focus:border-emerald-600"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setDeparturesModal((prev) => ({
                                ...prev,
                                departures: prev.departures.map((d, i) =>
                                  i === dIdx ? { ...d, is_active: d.is_active === false } : d
                                ),
                              }));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                              dep.is_active !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {dep.is_active !== false ? (isBn ? "সক্রিয়" : "Active") : (isBn ? "নিষ্ক্রিয়" : "Inactive")}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeparturesModal((prev) => ({
                                ...prev,
                                departures: prev.departures.filter((_, i) => i !== dIdx),
                              }));
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                            title="Delete this departure date"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                {num(departuresModal.departures.length)} {isBn ? "টি নির্ধারিত যাত্রা" : "total scheduled departure(s)"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeparturesModal((prev) => ({ ...prev, isOpen: false, tour: null }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {dict.modals.departures.cancel}
                </button>
                <button
                  type="button"
                  disabled={departuresModal.isSaving}
                  onClick={handleSaveDeparturesModal}
                  className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {departuresModal.isSaving ? (isBn ? "সংরক্ষণ করা হচ্ছে…" : "Saving…") : dict.modals.departures.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tour Modal */}
      {tourModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {tourModal.tour?.id ? dict.modals.tour.editTitle : dict.modals.tour.newTitle}
              </h3>
              <button
                onClick={() => setTourModal({ isOpen: false, tour: null })}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTour} className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ট্যুর প্যাকেজের নাম *" : "Tour Title *"}
                  <input
                    required
                    name="title"
                    defaultValue={tourModal.tour?.title}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder={isBn ? "যেমন: সাজেক মেঘের উপত্যকা" : "e.g. Sajek Cloud Escape"}
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ইউআরএল স্ল্যাগ (ঐচ্ছিক)" : "URL Slug (optional)"}
                  <input
                    name="slug"
                    defaultValue={tourModal.tour?.slug}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="e.g. sajek-cloud-escape"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "গন্তব্য *" : "Destination *"}
                  <select
                    name="destination_slug"
                    defaultValue={tourModal.tour?.destination_slug || destinations[0]?.slug}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    {destinations.length === 0 ? (
                      <option value="bangladesh">{isBn ? "সাধারণ / বাংলাদেশ" : "General / Bangladesh"}</option>
                    ) : (
                      destinations.map((d) => (
                        <option key={d.slug} value={d.slug}>{d.name}</option>
                      ))
                    )}
                  </select>
                </label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 text-xs font-medium">{isBn ? "ক্যাটাগরি *" : "Category *"}</label>
                    <button
                      type="button"
                      onClick={() => setCategoryModal({ isOpen: true, category: null })}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                      title="Create a new tour category"
                    >
                      {isBn ? "+ নতুন ক্যাটাগরি" : "+ New Category"}
                    </button>
                  </div>
                  <select
                    name="category"
                    defaultValue={tourModal.tour?.category || (tourCategories[0]?.slug || "group_tour")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    {tourCategories.length === 0 ? (
                      <>
                        <option value="group_tour">Group Tour</option>
                        <option value="private_tour">Private Tour</option>
                        <option value="honeymoon_package">Honeymoon Package</option>
                        <option value="family_tour">Family Tour</option>
                        <option value="adventure_tour">Adventure Tour</option>
                        <option value="weekend_getaway">Weekend Getaway</option>
                      </>
                    ) : (
                      tourCategories.map((c) => (
                        <option key={c.id || c.slug} value={c.slug}>
                          {c.icon ? `${c.icon} ` : ""}{c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "অবস্থা *" : "Status *"}
                  <select
                    name="status"
                    defaultValue={tourModal.tour?.status || "published"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    <option value="published">{isBn ? "প্রকাশিত (Published)" : "Published"}</option>
                    <option value="draft">{isBn ? "খসড়া (Draft)" : "Draft"}</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "দিন *" : "Days *"}
                  <input
                    type="number"
                    name="duration_days"
                    defaultValue={tourModal.tour?.duration_days || 3}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "রাত *" : "Nights *"}
                  <input
                    type="number"
                    name="duration_nights"
                    defaultValue={tourModal.tour?.duration_nights || 2}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "মূল মূল্য (৳) *" : "Base Price (৳) *"}
                  <input
                    required
                    type="number"
                    name="base_price"
                    defaultValue={tourModal.tour?.base_price || 25000}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ছাড় (৳)" : "Discount (৳)"}
                  <input
                    type="number"
                    name="discount_value"
                    defaultValue={tourModal.tour?.discount_value || 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "অগ্রিম বুকিং ডিপোজিট (%) *" : "Advance Deposit Required (%) *"}
                  <input
                    type="number"
                    name="advance_payment_percent"
                    defaultValue={tourModal.tour?.advance_payment_percent || 40}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "প্রতি যাত্রায় মোট আসন" : "Total Seats per Departure"}
                  <input
                    type="number"
                    name="total_seats"
                    defaultValue={tourModal.tour?.total_seats || 40}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              {/* Scheduled Departures & Seat Capacity Management */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5 text-emerald-900 font-bold uppercase tracking-wider text-[11px]">
                    <span>🚌</span>
                    <span>Scheduled Departures & Seat Capacity ({modalTourDepartures.length})</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Add tour dates and configure seats for calendar booking
                  </span>
                </div>

                {/* Add Departure Inputs */}
                <div className="flex flex-wrap items-end gap-2.5 p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Departure Date (তারিখ)
                    </label>
                    <input
                      type="date"
                      value={modalNewDepDate}
                      onChange={(e) => setModalNewDepDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Seats (আসন)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={modalNewDepSeats}
                      onChange={(e) => setModalNewDepSeats(e.target.value)}
                      placeholder="40"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!modalNewDepDate) {
                        showNotification("error", "Please select a departure date.");
                        return;
                      }
                      if (modalTourDepartures.some((d) => d.departure_date === modalNewDepDate)) {
                        showNotification("error", `Departure for ${modalNewDepDate} is already added.`);
                        return;
                      }
                      const cap = Math.max(1, Number(modalNewDepSeats) || 40);
                      const newDep: DbDeparture = {
                        id: `dep-${modalNewDepDate}-${Date.now()}`,
                        departure_date: modalNewDepDate,
                        total_seats: cap,
                        seats_remaining: cap,
                        booked_seats: [],
                        is_active: true,
                      };
                      setModalTourDepartures((prev) =>
                        [...prev, newDep].sort((a, b) =>
                          a.departure_date.localeCompare(b.departure_date)
                        )
                      );
                      setModalNewDepDate("");
                      showNotification("success", `Added departure for ${modalNewDepDate}.`);
                    }}
                    className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-2xs cursor-pointer h-[32px] flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add Date</span>
                  </button>
                </div>

                {/* List of departures */}
                {modalTourDepartures.length === 0 ? (
                  <div className="text-center py-3 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No departures added yet. Use the inputs above to schedule tour dates.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                    {modalTourDepartures.map((dep, dIdx) => (
                      <div
                        key={dep.id || dIdx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs shadow-2xs transition ${
                          dep.is_active !== false
                            ? "bg-white border-slate-200"
                            : "bg-slate-100 border-slate-200/60 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>📅</span>
                            <span>{dep.departure_date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Booked: {dep.booked_seats?.length || 0} · Left: {dep.seats_remaining ?? dep.total_seats ?? 40}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={Math.max(1, dep.booked_seats?.length || 0)}
                            value={dep.total_seats || 40}
                            onChange={(e) => {
                              const newCap = Math.max(1, Number(e.target.value) || 40);
                              const bookedCount = dep.booked_seats?.length || 0;
                              setModalTourDepartures((prev) =>
                                prev.map((d, i) =>
                                  i === dIdx
                                    ? {
                                        ...d,
                                        total_seats: newCap,
                                        seats_remaining: Math.max(0, newCap - bookedCount),
                                      }
                                    : d
                                )
                              );
                            }}
                            className="w-14 rounded-lg border border-slate-300 px-1.5 py-1 text-center font-mono font-bold text-xs"
                            title="Edit seat capacity for this departure"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setModalTourDepartures((prev) =>
                                prev.map((d, i) =>
                                  i === dIdx ? { ...d, is_active: d.is_active === false } : d
                                )
                              );
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                              dep.is_active !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-200 text-slate-600 border-slate-300"
                            }`}
                          >
                            {dep.is_active !== false ? "Active" : "Off"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalTourDepartures((prev) => prev.filter((_, i) => i !== dIdx));
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Remove departure"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tour Logistics & Boarding: Meeting, Departs, Meals, Stay, Transport, Pickups */}
              <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 pb-1 border-b border-emerald-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs">✨</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Tour Logistics & Boarding (লজিস্টিক, খাবার ও যাতায়াত ব্যবস্থা)</h4>
                    <p className="text-[11px] text-slate-500">Configure meeting point, schedule, meals arrangement, hotel/resort stay, transport, and pick-up spots.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                    <span>📍 Meeting Point (মিটিং পয়েন্ট)</span>
                    <input
                      name="meeting_point"
                      defaultValue={tourModal.tour?.meeting_point || "Dhaka Sayedabad / Fakirapool"}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                    <span>🗓️ Departure Schedule (যাত্রার শিডিউল)</span>
                    <input
                      name="departure_schedule"
                      defaultValue={tourModal.tour?.departure_schedule || "Every Thursday night"}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-slate-700 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span>🍽️ Meals Arrangement (খাবার ব্যবস্থা)</span>
                    <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Directly controls &quot;Meals&quot; logistics</span>
                  </span>
                  <textarea
                    rows={2}
                    name="meals_notes"
                    defaultValue={tourModal.tour?.meals_notes || "Breakfast included"}
                    placeholder="e.g. Breakfast included or ৫ বেলা মানসম্মত খাবার (সকালের নাস্তা, দুপুর ও রাতের খাবার)"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-normal"
                  />
                  <span className="text-[11px] font-normal text-slate-400">
                    Displayed with other logistics on the public tour page (top Quick Specs bar and dedicated Tour Logistics section).
                  </span>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                    <span>🏨 Stay / Accommodation (থাকার ব্যবস্থা)</span>
                    <input
                      name="accommodation_notes"
                      defaultValue={tourModal.tour?.accommodation_notes || "Standard hotel / resort"}
                      placeholder="e.g. Eco-cottage with mountain view or 3-Star Beach Resort"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                    <span className="text-[11px] text-slate-400">
                      Displayed under &quot;Stay / থাকা&quot; in the tour logistics bar.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                    <span>🚌 Transportation (যাতায়াত ব্যবস্থা)</span>
                    <input
                      name="transportation_notes"
                      defaultValue={tourModal.tour?.transportation_notes || "AC Bus / Private Jeep"}
                      placeholder="e.g. AC Hino 1J Chair Coach & 4WD Chander Gari"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    />
                    <span className="text-[11px] text-slate-400">
                      Displayed under &quot;Transport / যাতায়াত&quot; in the tour logistics bar.
                    </span>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  <span>🗺️ Pick-up Points (পিক-আপ পয়েন্ট সমূহ — প্রতি লাইনে একটি)</span>
                  <textarea
                    name="pickup_points"
                    rows={3}
                    defaultValue={
                      tourModal.tour?.pickup_points && tourModal.tour.pickup_points.length > 0
                        ? tourModal.tour.pickup_points.join("\n")
                        : ""
                    }
                    placeholder={"Savar Thana Stand (09:00 PM)\nSavar Pollibidut (09:15 PM)\nGabtoli Bus Terminal (09:45 PM)\nKallyanpur Bus Stand (10:15 PM)\nSayedabad Janapath (11:00 PM)"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-mono text-xs"
                  />
                  <span className="text-[11px] text-slate-400">
                    Leave blank to use default Savar / Dhaka boarding points. Travelers select from these points during booking.
                  </span>
                </label>
              </div>

              <ImageUrlInput
                label="Cover Photo URL"
                name="hero_image"
                defaultValue={tourModal.tour?.hero_image || ""}
                placeholder="Google Drive link or any custom image URL (https://...)"
                helperText="Supports Google Drive share links ('Anyone with the link can view'), Dropbox, or any direct image URL."
              />

              {tourModal.tour?.id && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <span>📸</span>
                      <span>Tour Photos & Scenery Gallery (Bento Layout)</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {tourModal.tour?.gallery?.length || 0} photos currently configured for this tour.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (tourModal.tour) {
                        openTourGalleryModal(tourModal.tour as DbTour);
                      }
                    }}
                    className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
                  >
                    Manage Gallery Photos →
                  </button>
                </div>
              )}

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                Short Description
                <textarea
                  required
                  rows={2}
                  name="short_description"
                  defaultValue={tourModal.tour?.short_description}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-semibold">
                <span className="flex items-center justify-between">
                  <span>Detailed Overview (বিস্তারিত বিবরণ — প্যারাগ্রাফ, লাইন ব্রেক ও বুলেট পয়েন্ট ফরম্যাট)</span>
                  <span className="text-[11px] font-normal text-emerald-700">Paragraphs & Line breaks preserved</span>
                </span>
                <textarea
                  rows={6}
                  name="full_description"
                  defaultValue={tourModal.tour?.full_description}
                  placeholder={"প্রথম দিন: সকালে নাস্তা শেষে...\n\nদ্বিতীয় দিন: সারাদিন ঘুরে...\n\nপরের দিন সকালে চেক-আউট করে..."}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-normal"
                />
                <span className="text-[11px] font-normal text-slate-400">
                  Enter key separates paragraphs. Day headings (e.g. প্রথম দিন:, দ্বিতীয় দিন:) and bullet points (- / •) are automatically styled on the public tour page.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span>📍 Places You&apos;ll Visit / Sightseeing Spots (যে স্থানগুলো ঘুরে দেখবেন)</span>
                  <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">Displayed after Overview card</span>
                </span>
                <textarea
                  rows={3}
                  name="places_to_visit"
                  defaultValue={
                    tourModal.tour?.places_to_visit && tourModal.tour.places_to_visit.length > 0
                      ? tourModal.tour.places_to_visit.join("\n")
                      : ""
                  }
                  placeholder={"কংলাক পাহাড়\nরুইলুই পাড়া\nসাজেক ভ্যালি ক্লাউড পয়েন্ট\nআলুটিলা রহস্যময় গুহা\nরিছাং ঝর্ণা\nতারেং ভিউ পয়েন্ট"}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-mono text-xs"
                />
                <span className="text-[11px] font-normal text-slate-400">
                  Enter places one per line or comma-separated. Leave blank to automatically display destination attractions.
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  Inclusions (comma-separated)
                  <input
                    name="inclusions"
                    defaultValue={tourModal.tour?.inclusions?.join(", ") || "AC Bus, Cottage stay, 3 meals daily, Guide fee"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  Exclusions (comma-separated)
                  <input
                    name="exclusions"
                    defaultValue={tourModal.tour?.exclusions?.join(", ") || "Personal expenses, Tips"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allow_partial_payment"
                    defaultChecked={tourModal.tour?.allow_partial_payment ?? true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "আংশিক অগ্রিম পেমেন্টের অনুমতি দিন" : "Allow Partial Advance Payment"}
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={tourModal.tour?.is_featured ?? true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "হোমপেজে ফিচার করুন" : "Feature on Homepage"}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTourModal({ isOpen: false, tour: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.modals.tour.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {dict.modals.tour.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destination Modal */}
      {destModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {destModal.destination?.id ? (isBn ? "গন্তব্য সম্পাদনা করুন" : "Edit Destination") : (isBn ? "নতুন গন্তব্য যোগ করুন" : "Create Destination")}
              </h3>
              <button onClick={() => setDestModal({ isOpen: false, destination: null })} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSaveDestination} className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "গন্তব্যের নাম *" : "Destination Name *"}
                  <input
                    required
                    name="name"
                    defaultValue={destModal.destination?.name}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="e.g. Saint Martin's Island"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ইউআরএল স্ল্যাগ" : "URL Slug"}
                  <input
                    name="slug"
                    defaultValue={destModal.destination?.slug}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="auto-generated from name"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "বিভাগ *" : "Division *"}
                  <select
                    name="division"
                    defaultValue={destModal.destination?.division?.toLowerCase() || "chattogram"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    <option value="chattogram">{isBn ? "চট্টগ্রাম বিভাগ" : "Chattogram"}</option>
                    <option value="dhaka">{isBn ? "ঢাকা বিভাগ" : "Dhaka"}</option>
                    <option value="sylhet">{isBn ? "সিলেট বিভাগ" : "Sylhet"}</option>
                    <option value="khulna">{isBn ? "খুলনা বিভাগ" : "Khulna"}</option>
                    <option value="barishal">{isBn ? "বরিশাল বিভাগ" : "Barishal"}</option>
                    <option value="rajshahi">{isBn ? "রাজশাহী বিভাগ" : "Rajshahi"}</option>
                    <option value="rangpur">{isBn ? "রংপুর বিভাগ" : "Rangpur"}</option>
                    <option value="mymensingh">{isBn ? "ময়মনসিংহ বিভাগ" : "Mymensingh"}</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ট্যাগলাইন" : "Tagline"}
                  <input
                    name="tagline"
                    defaultValue={destModal.destination?.tagline}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="e.g. Bangladesh's only coral island"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ভ্রমণের সেরা সময়" : "Best Time to Visit"}
                  <input
                    name="best_time_to_visit"
                    defaultValue={destModal.destination?.best_time_to_visit || "November to March"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "বিবরণ" : "Description"}
                <textarea
                  required
                  rows={3}
                  name="description"
                  defaultValue={destModal.destination?.description}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "জনপ্রিয় আকর্ষণসমূহ (কমা দিয়ে আলাদা করুন)" : "Popular Attractions (comma-separated)"}
                <input
                  name="popular_attractions"
                  defaultValue={destModal.destination?.popular_attractions?.join(", ")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="Chera Dwip, West Beach, Coral Reefs"
                />
              </label>

              <ImageUrlInput
                label={isBn ? "কভার ছবির লিঙ্ক" : "Cover Photo URL"}
                name="cover_image"
                defaultValue={destModal.destination?.cover_image || ""}
                placeholder="Google Drive link or any custom image URL (https://...)"
                helperText="Supports Google Drive share links ('Anyone with the link can view'), Dropbox, or any direct image URL."
              />

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "প্রস্তাবিত আবাসন" : "Recommended Lodging"}
                <input
                  name="recommended_accommodation"
                  defaultValue={destModal.destination?.recommended_accommodation || "Eco Beach Resort"}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "ভ্রমণ নির্দেশিকা ও টিপস" : "Travel Guidelines & Tips"}
                <textarea
                  rows={2}
                  name="travel_tips"
                  defaultValue={destModal.destination?.travel_tips}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="Book ship tickets 3 days ahead in peak winter."
                />
              </label>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={destModal.destination?.is_featured ?? true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "ফিচার্ড গন্তব্য" : "Featured Destination"}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  {isBn ? "অবস্থা:" : "Status:"}
                  <select
                    name="status"
                    defaultValue={destModal.destination?.status || "published"}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-xs"
                  >
                    <option value="published">{isBn ? "প্রকাশিত" : "Published"}</option>
                    <option value="draft">{isBn ? "খসড়া" : "Draft"}</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDestModal({ isOpen: false, destination: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {isBn ? "গন্তব্য সংরক্ষণ করুন" : "Save Destination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Modal */}
      {blogModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <h3 className="text-base font-semibold text-slate-900">
                {blogModal.post?.id ? (isBn ? "জার্নাল আর্টিকেল সম্পাদনা" : "Edit Journal Article") : (isBn ? "নতুন আর্টিকেল লিখুন" : "Write Journal Article")}
              </h3>
              <button onClick={() => setBlogModal({ isOpen: false, post: null })} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleSaveBlog} className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "আর্টিকেলের শিরোনাম *" : "Article Title *"}
                  <input
                    required
                    name="title"
                    defaultValue={blogModal.post?.title}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ইউআরএল স্ল্যাগ" : "URL Slug"}
                  <input
                    name="slug"
                    defaultValue={blogModal.post?.slug}
                    placeholder="e.g. sajek-travel-guide (auto-generated if empty)"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-mono"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "লেখক *" : "Author *"}
                  <input
                    required
                    name="author"
                    defaultValue={blogModal.post?.author_name || blogModal.post?.author || "Savar Tour Lover Editorial Team"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ক্যাটাগরি *" : "Category *"}
                  <input
                    name="category"
                    defaultValue={blogModal.post?.category?.name || "Travel Guide"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <ImageUrlInput
                label={isBn ? "কভার ছবির লিঙ্ক" : "Cover Image URL"}
                name="hero_image"
                defaultValue={blogModal.post?.cover_image || blogModal.post?.hero_image || ""}
                placeholder="Google Drive link or any custom image URL (https://...)"
                helperText="Supports Google Drive share links ('Anyone with the link can view'), Dropbox, or any direct image URL."
              />

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "পড়ার আনুমানিক সময় (মিনিট)" : "Estimated Read Time (minutes)"}
                <input
                  type="number"
                  name="read_time_minutes"
                  defaultValue={blogModal.post?.read_time_minutes || 5}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "সংক্ষিপ্ত বিবরণ" : "Article Excerpt / Preview Summary"}
                <textarea
                  rows={2}
                  name="excerpt"
                  defaultValue={blogModal.post?.excerpt}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="Short summary displayed on cards and search results..."
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "আর্টিকেলের মূল বক্তব্য (Markdown সমর্থিত)" : "Article Body (Markdown supported)"}
                <textarea
                  required
                  rows={8}
                  name="content"
                  defaultValue={blogModal.post?.body || blogModal.post?.content}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs font-mono"
                  placeholder="Write body content here…"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)" : "Tags (comma-separated)"}
                <input
                  name="tags"
                  defaultValue={blogModal.post?.tags?.join(", ") || "Bangladesh, Travel, Guide"}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_published"
                    defaultChecked={blogModal.post?.status === "published" || blogModal.post?.is_published === true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "অবিলম্বে প্রকাশ করুন" : "Publish Immediately"}
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={blogModal.post?.is_featured === true}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  {isBn ? "হোম ও জার্নালে ফিচার করুন" : "Feature this Story (Hero display on Travel Journal)"}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBlogModal({ isOpen: false, post: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {isBn ? "আর্টিকেল সংরক্ষণ করুন" : "Save Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {offerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {offerModal.offer?.id ? (isBn ? "অফার সম্পাদনা করুন" : "Edit Special Offer") : (isBn ? "নতুন অফার তৈরি করুন" : "Create Special Offer")}
            </h3>
            <form onSubmit={handleSaveOffer} className="space-y-3.5 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "প্রোমো কোড *" : "Promo Code *"}
                  <input
                    required
                    name="code"
                    defaultValue={offerModal.offer?.code || offerModal.offer?.slug}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase font-mono outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                    placeholder="WINTER20"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ছাড়ের ধরণ" : "Discount Type"}
                  <select
                    name="discount_type"
                    defaultValue={offerModal.offer?.discount_type || "percent"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    <option value="percent">{isBn ? "শতাংশ (%)" : "Percentage (%)"}</option>
                    <option value="flat">{isBn ? "নির্দিষ্ট পরিমাণ (৳)" : "Flat Amount (৳)"}</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "ছাড়ের পরিমাণ *" : "Discount Value *"}
                  <input
                    required
                    type="number"
                    name="discount_value"
                    defaultValue={offerModal.offer?.discount_value || 15}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "সর্বনিম্ন খরচ (৳)" : "Minimum Spend (৳)"}
                  <input
                    type="number"
                    name="minimum_spend"
                    defaultValue={offerModal.offer?.minimum_spend || 0}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "ক্যাম্পেইনের নাম *" : "Campaign Title *"}
                <input
                  required
                  name="title"
                  defaultValue={offerModal.offer?.title}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="e.g. Winter Holiday Special"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "প্রযোজ্য ট্যুর (নির্দিষ্ট ট্যুর বা সকল ট্যুর)" : "Applicable Tour (নির্দিষ্ট ট্যুর বা সকল ট্যুর)"}
                <select
                  name="tour_id"
                  defaultValue={offerModal.offer?.tour_id || offerModal.offer?.tour_slug || ""}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                >
                  <option value="">{isBn ? "🌐 সকল ট্যুর (উন্মুক্ত)" : "🌐 All Tours (সকল ট্যুরের জন্য উন্মুক্ত)"}</option>
                  {tours.map((t) => (
                    <option key={t.id || t.slug} value={t.id || t.slug}>
                      🎯 {t.title}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500">
                  {isBn
                    ? "নির্দিষ্ট কোনো ট্যুর নির্বাচন করলে প্রোমোকোডটি শুধুমাত্র সেই ট্যুরের বুকিংয়ে প্রযোজ্য হবে।"
                    : "নির্দিষ্ট কোনো ট্যুর নির্বাচন করলে প্রোমোকোডটি শুধুমাত্র সেই ট্যুরের বুকিংয়ে প্রযোজ্য হবে। অন্য কোনো ট্যুরে গ্রাহক এটি ব্যবহার করতে পারবে না।"}
                </span>
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "বিবরণ" : "Description"}
                <textarea
                  rows={2}
                  name="description"
                  defaultValue={offerModal.offer?.description}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <ImageUrlInput
                label={isBn ? "ব্যানার ছবির লিঙ্ক (ঐচ্ছিক)" : "Banner Image URL (optional)"}
                name="banner_image"
                defaultValue={offerModal.offer?.banner_image || ""}
                placeholder="Google Drive link or any custom image URL (https://...)"
                helperText="Displayed at the top of the special offer card across the website."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "শুরুর তারিখ" : "Valid From"}
                  <input
                    type="date"
                    name="valid_from"
                    defaultValue={offerModal.offer?.valid_from ? offerModal.offer.valid_from.slice(0, 10) : ""}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "মেয়াদ উত্তীর্ণের তারিখ" : "Valid Until"}
                  <input
                    type="date"
                    name="valid_until"
                    defaultValue={offerModal.offer?.valid_until ? offerModal.offer.valid_until.slice(0, 10) : ""}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none shadow-xs"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={offerModal.offer?.is_active ?? true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "সক্রিয় ও ব্যবহারযোগ্য" : "Active & Redeemable"}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOfferModal({ isOpen: false, offer: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {isBn ? "অফার সংরক্ষণ করুন" : "Save Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Testimonial Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {reviewModal.review?.id ? (isBn ? "রিভিউ সম্পাদনা করুন" : "Edit Testimonial") : (isBn ? "নতুন কাস্টমার রিভিউ যোগ করুন" : "Add Customer Testimonial")}
            </h3>
            <form onSubmit={handleSaveReview} className="space-y-3.5 text-sm">
              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "গ্রাহকের নাম *" : "Customer Full Name *"}
                <input
                  required
                  name="author_name"
                  defaultValue={reviewModal.review?.author_name || reviewModal.review?.customer_name}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="Farzana Islam"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "অবস্থান" : "Location"}
                  <input
                    name="author_location"
                    defaultValue={reviewModal.review?.author_location || "Dhaka"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "স্টার রেটিং (১-৫) *" : "Star Rating (1-5) *"}
                  <select
                    name="rating"
                    defaultValue={reviewModal.review?.rating || 5}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  >
                    <option value={5}>{isBn ? "৫ স্টার (অসাধারণ)" : "5 Stars (Exceptional)"}</option>
                    <option value={4}>{isBn ? "৪ স্টার (খুব ভালো)" : "4 Stars (Very Good)"}</option>
                    <option value={3}>{isBn ? "৩ স্টার (মোটামুটি)" : "3 Stars (Average)"}</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "যে ট্যুর প্যাকেজে ভ্রমণ করেছেন *" : "Tour Package Taken *"}
                <input
                  required
                  name="trip_name"
                  defaultValue={reviewModal.review?.trip_name || reviewModal.review?.tour_title || "Sajek Valley Experience"}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <ImageUrlInput
                label={isBn ? "গ্রাহকের ছবির লিঙ্ক (ঐচ্ছিক)" : "Customer Photo / Avatar URL (optional)"}
                name="author_avatar"
                defaultValue={reviewModal.review?.author_avatar || reviewModal.review?.customer_photo || ""}
                placeholder="Google Drive link or any custom image URL (https://...)"
                helperText="Shown next to traveler review across the website."
              />

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "গ্রাহকের মতামত / উক্তি *" : "Customer Testimonial Quote *"}
                <textarea
                  required
                  rows={3}
                  name="quote"
                  defaultValue={reviewModal.review?.quote}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder="The tour host was attentive and punctual throughout the trip."
                />
              </label>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={reviewModal.review?.is_featured ?? true}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isBn ? "হোমপেজ শোকেসে ফিচার করুন" : "Feature on Homepage Showcase"}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, review: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {isBn ? "রিভিউ সংরক্ষণ করুন" : "Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inquiry Detail & Response Modal */}
      {inquiryModal.isOpen && inquiryModal.inquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {isBn ? "কাস্টমার অনুসন্ধান ফলো-আপ" : "Customer Lead Follow-up"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isBn ? "অনুসন্ধানকারী:" : "Inquiry from"}{" "}
              <span className="font-medium text-slate-800">{inquiryModal.inquiry.name}</span> (
              {isBn && inquiryModal.inquiry.phone ? toBengaliNumber(inquiryModal.inquiry.phone) : inquiryModal.inquiry.phone}
              )
            </p>

            <form onSubmit={handleSaveInquiry} className="space-y-4 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div>
                  <strong className="text-slate-900">{isBn ? "গন্তব্য:" : "Destination:"}</strong>{" "}
                  {inquiryModal.inquiry.destination || (isBn ? "কাস্টম" : "Custom")}
                </div>
                <div>
                  <strong className="text-slate-900">{isBn ? "ভ্রমণকারী:" : "Travelers:"}</strong>{" "}
                  {isBn && inquiryModal.inquiry.travelers ? toBengaliNumber(inquiryModal.inquiry.travelers) : (inquiryModal.inquiry.travelers || (isBn ? "ফ্লেক্সিবল" : "Flexible"))}
                </div>
                <div>
                  <strong className="text-slate-900">{isBn ? "বার্তা:" : "Message:"}</strong> &ldquo;{inquiryModal.inquiry.message}&rdquo;
                </div>
              </div>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "অনুসন্ধানের বর্তমান অবস্থা" : "Inquiry Lifecycle Status"}
                <select
                  name="status"
                  defaultValue={inquiryModal.inquiry.status}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                >
                  <option value="new">{isBn ? "নতুন (যোগাযোগ হয়নি)" : "New (Uncontacted)"}</option>
                  <option value="in_progress">{isBn ? "চলমান / যোগাযোগ করা হয়েছে" : "In Progress / Contacted"}</option>
                  <option value="resolved">{isBn ? "সম্পন্ন / কোটেশন প্রেরিত" : "Resolved / Quote Sent"}</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "স্টাফ ফলো-আপ নোট" : "Internal Staff Follow-up Notes"}
                <textarea
                  rows={3}
                  name="admin_notes"
                  defaultValue={inquiryModal.inquiry.admin_notes || ""}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  placeholder={isBn ? "যেমন: ফোনে কাস্টমারের সাথে কথা হয়েছে..." : "e.g. Contacted customer via phone at 3:30 PM. Provided itinerary details."}
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInquiryModal({ isOpen: false, inquiry: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.common.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  {isBn ? "আপডেট করুন" : "Update Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MANAGE TOUR CATEGORIES MODAL ================= */}
      {manageCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏷️</span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{dict.modals.categories.title}</h3>
                  <p className="text-xs text-slate-500">
                    {isBn ? "ভ্রমণ শৈলী, প্যাকেজ এবং মৌসুমী ট্যুর ক্যাটাগরি নির্ধারণ করুন" : "Define travel styles, packages, and seasonal tour categories"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ isOpen: true, category: null })}
                  className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span> {dict.modals.categories.addCategory}
                </button>
                <button
                  type="button"
                  onClick={() => setManageCategoriesModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-4">
              {tourCategories.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  <p className="text-2xl mb-2">🏷️</p>
                  <p className="font-semibold text-slate-700">{isBn ? "কোনো ক্যাটাগরি পাওয়া যায়নি।" : "No categories found."}</p>
                  <p className="text-xs text-slate-400 mt-1">{isBn ? "উপরে '+ নতুন ক্যাটাগরি' বোতামে ক্লিক করুন।" : "Click 'New Category' above to create one."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">{isBn ? "ক্যাটাগরির নাম" : "Category Name"}</th>
                        <th className="px-4 py-3">{isBn ? "স্ল্যাগ / কোড" : "Slug / Code"}</th>
                        <th className="px-4 py-3">{isBn ? "ব্যাজ" : "Badge"}</th>
                        <th className="px-4 py-3">{isBn ? "সংযুক্ত ট্যুর" : "Tours Assigned"}</th>
                        <th className="px-4 py-3">{isBn ? "অবস্থা" : "Status"}</th>
                        <th className="px-4 py-3 text-right">{isBn ? "অ্যাকশন" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tourCategories.map((c) => {
                        const toursCount = tours.filter((t) => t.category === c.slug || t.category === c.name).length;
                        return (
                          <tr key={c.id || c.slug} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{c.icon || "🏷️"}</span>
                                <div>
                                  <div className="font-semibold text-slate-900">{c.name}</div>
                                  {c.description && (
                                    <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{c.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                              {c.slug}
                            </td>
                            <td className="px-4 py-3">
                              {c.badge ? (
                                <span className="rounded bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-xs font-semibold">
                                  {c.badge}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                {num(toursCount)} {isBn ? "টি ট্যুর" : (toursCount === 1 ? "tour" : "tours")}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryActive(c)}
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer border transition ${
                                  c.is_active !== false
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                }`}
                                title="Click to toggle active/hidden"
                              >
                                {c.is_active !== false ? (isBn ? "✓ সক্রিয়" : "✓ Active") : (isBn ? "লুকানো" : "Hidden")}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCategoryModal({ isOpen: true, category: c })}
                                  className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                  title="Edit Category"
                                >
                                  ✏️ {dict.common.edit}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTourCategory(c.id, c.name)}
                                  className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete Category"
                                >
                                  🗑️ {dict.common.delete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
              <span className="text-xs text-slate-500">
                {isBn
                  ? "ক্যাটাগরি ডাটাবেসের সাথে সিঙ্ক করা হয় এবং তাৎক্ষণিকভাবে ট্যুর তৈরির সময় পাওয়া যাবে।"
                  : "Categories are synced with Supabase and immediately available when creating or editing tours."}
              </span>
              <button
                type="button"
                onClick={() => setManageCategoriesModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs"
              >
                {isBn ? "সম্পন্ন" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT CATEGORY MODAL ================= */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {categoryModal.category?.id ? (isBn ? "ট্যুর ক্যাটাগরি সম্পাদনা" : "Edit Tour Category") : (isBn ? "নতুন ট্যুর ক্যাটাগরি তৈরি" : "Create New Tour Category")}
                </h3>
                <p className="text-xs text-slate-500">
                  {categoryModal.category?.id
                    ? (isBn ? "ক্যাটাগরি বিবরণ ও ব্যাজ সংশোধন করুন" : "Modify category details and display badge")
                    : (isBn ? "নতুন ভ্রমণ শৈলী বা প্যাকেজ ক্যাটাগরি যোগ করুন" : "Add a new tour style or package category")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModal({ isOpen: false, category: null })}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTourCategory} className="space-y-4 text-sm">
              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "ক্যাটাগরির নাম *" : "Category Name *"}
                <input
                  required
                  name="name"
                  defaultValue={categoryModal.category?.name || ""}
                  placeholder="e.g. Corporate Retreat, Day Trip, Coastal Adventure"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "স্ল্যাগ / কি" : "Slug / Key"}
                  <input
                    name="slug"
                    defaultValue={categoryModal.category?.slug || ""}
                    placeholder="e.g. corporate_retreat"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-400">{isBn ? "খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে" : "Leave blank to auto-generate"}</span>
                </label>

                <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                  {isBn ? "আইকন / ইমোজি" : "Icon / Emoji"}
                  <input
                    name="icon"
                    defaultValue={categoryModal.category?.icon || "🏷️"}
                    placeholder="e.g. 🏢, 🧗, ⛺, 🏖️"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "ব্যাজ / ট্যাগ (ঐচ্ছিক)" : "Badge / Tag (Optional)"}
                <input
                  name="badge"
                  defaultValue={categoryModal.category?.badge || ""}
                  placeholder="e.g. Popular, Best Value, Trending"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-slate-700 text-xs font-medium">
                {isBn ? "বিবরণ (ঐচ্ছিক)" : "Description (Optional)"}
                <textarea
                  rows={2}
                  name="description"
                  defaultValue={categoryModal.category?.description || ""}
                  placeholder="Short explanation of what this tour category covers..."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
                />
              </label>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={categoryModal.category?.is_active !== false}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>{isBn ? "সক্রিয় (ট্যুর ফর্ম ও ক্যাটাগরি ফিল্টারে দৃশ্যমান)" : "Active (Visible in tour forms and category filters)"}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ isOpen: false, category: null })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {dict.modals.categories.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                >
                  {categoryModal.category?.id ? dict.modals.categories.save : (isBn ? "ক্যাটাগরি তৈরি করুন" : "Create Category")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔑</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{dict.modals.password.title}</h3>
                  <p className="text-xs text-slate-500">
                    {isBn ? "নিরাপদে আপনার অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন করুন" : "Update your account credentials safely"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const currentPassword = (form.elements.namedItem("current_password") as HTMLInputElement)?.value;
                const newPassword = (form.elements.namedItem("new_password") as HTMLInputElement)?.value;
                const confirmPassword = (form.elements.namedItem("confirm_password") as HTMLInputElement)?.value;

                if (!newPassword || newPassword.length < 8) {
                  showNotification("error", isBn ? "নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" : "New password must be at least 8 characters.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  showNotification("error", isBn ? "নতুন পাসওয়ার্ড দুইটি মেলেনি।" : "New passwords do not match.");
                  return;
                }

                setPasswordSubmitting(true);
                try {
                  const res = await staffFetch("/admin/staff/change-password", {
                    method: "POST",
                    body: JSON.stringify({
                      current_password: currentPassword || undefined,
                      new_password: newPassword,
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    showNotification("error", data.detail || (isBn ? "পাসওয়ার্ড আপডেট করতে ব্যর্থ হয়েছে।" : "Failed to update password."));
                  } else {
                    showNotification("success", isBn ? "পাসওয়ার্ড সফলভাবে আপডেট হয়েছে! ✅" : "Password updated successfully across all databases! ✅");
                    setPasswordModalOpen(false);
                  }
                } catch {
                  showNotification("error", isBn ? "পাসওয়ার্ড আপডেট করতে নেটওয়ার্ক সমস্যা হয়েছে।" : "Network error updating password.");
                } finally {
                  setPasswordSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {dict.modals.password.currentPass}{" "}
                  <span className="text-slate-400 font-normal">
                    {isBn ? "(সুপার অ্যাডমিন হলে ঐচ্ছিক)" : "(optional if super admin)"}
                  </span>
                </label>
                <input
                  type="password"
                  name="current_password"
                  placeholder={isBn ? "বর্তমান পাসওয়ার্ড লিখুন" : "Enter current password"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {dict.modals.password.newPass}{" "}
                  <span className="text-rose-500">* {isBn ? "(কমপক্ষে ৮ অক্ষর)" : "(min 8 chars)"}</span>
                </label>
                <input
                  type="password"
                  name="new_password"
                  required
                  minLength={8}
                  placeholder={isBn ? "নতুন শক্তিশালী পাসওয়ার্ড লিখুন" : "Enter strong new password"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {dict.modals.password.confirmPass} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  minLength={8}
                  placeholder={isBn ? "নতুন পাসওয়ার্ড পুনরায় লিখুন" : "Re-enter new password"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {dict.modals.password.cancel}
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {passwordSubmitting
                    ? (isBn ? "আপডেট হচ্ছে…" : "Updating…")
                    : dict.modals.password.updateBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
