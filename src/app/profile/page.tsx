"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { DbBooking, DbCustomerActivity, DbCustomerUser } from "@/server/types";
import { TourTicketModal } from "@/components/TourTicketModal";
import { isTicketVisible, getTicketVisibilityStatus, TICKET_COMPANY_INFO } from "@/lib/ticketUtils";

function formatBDT(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return "৳" + Math.round(num).toLocaleString("en-BD");
}

function formatDate(dateStr?: string, isBn?: boolean): string {
  if (!dateStr) return isBn ? "তারিখ নির্ধারিত হয়নি" : "Date unassigned";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ProfileCashCountdown({ expiresAt, isBn }: { expiresAt?: string; isBn?: boolean }) {
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
      if (s <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const isExpired = timeLeft <= 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (isExpired) {
    return (
      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
        ❌ {isBn ? "১০ মিনিটের মেয়াদ শেষ" : "10m Window Expired"}
      </span>
    );
  }

  return (
    <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded border border-amber-300 animate-pulse">
      ⏳ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")} {isBn ? "বাকি" : "remaining"}
    </span>
  );
}

export default function CustomerProfilePage() {
  const { isBn } = useLanguage();

  // Auth & Profile states
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<DbCustomerUser | null>(null);
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [activities, setActivities] = useState<DbCustomerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Login form states (NO OTP, direct phone match)
  const [loginPhone, setLoginPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState("");

  // Active Tab
  const [activeTab, setActiveTab] = useState<"bookings" | "activity" | "support">("bookings");
  const [bookingFilter, setBookingFilter] = useState<"all" | "active" | "cleared">("all");

  // Edit Profile modal/form
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  // E-Ticket modal state
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<DbBooking | null>(null);

  // Check login on mount & auto-refresh when window regains focus (e.g. returning from SSLCommerz)
  useEffect(() => {
    const storedToken =
      localStorage.getItem("tourlover_customer_token") ||
      localStorage.getItem("atithi_customer_token");
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setIsLoading(false);
    }

    const onFocus = () => {
      const activeToken =
        localStorage.getItem("tourlover_customer_token") ||
        localStorage.getItem("atithi_customer_token");
      if (activeToken) {
        fetchProfile(activeToken);
      }
    };

    window.addEventListener("focus", onFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onFocus();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function fetchProfile(authToken: string) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/customer/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setBookings(data.bookings || []);
        setActivities(data.activities || []);
        setEditName(data.customer?.full_name || "");
        setEditEmail(data.customer?.email || "");
      } else {
        // Token invalid or expired
        handleLogout();
      }
    } catch {
      // Network error
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginPhone.trim()) return;

    setIsSubmittingLogin(true);
    try {
      const payload: { phone_number: string; full_name?: string } = { phone_number: loginPhone.trim() };
      if (isRegisterMode && registerName.trim()) {
        payload.full_name = registerName.trim();
      }

      const res = await fetch("/api/v1/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.notFound) {
          setIsRegisterMode(true);
        }
        throw new Error(
          data.error || (isBn ? "কোনো অ্যাকাউন্ট পাওয়া যায়নি।" : "No account found.")
        );
      }

      setToken(data.token);
      setCustomer(data.customer);
      localStorage.setItem("tourlover_customer_token", data.token);
      localStorage.setItem("tourlover_customer", JSON.stringify(data.customer));
      // The server already set the (httpOnly) session cookie on this response —
      // no need to (and, being httpOnly, no way to) set it again from JS.

      await fetchProfile(data.token);
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error
          ? err.message
          : isBn
            ? "লগইন করতে ব্যর্থ হয়েছে।"
            : "Failed to sign in."
      );
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setCustomer(null);
    setBookings([]);
    setActivities([]);
    localStorage.removeItem("tourlover_customer_token");
    localStorage.removeItem("tourlover_customer");
    localStorage.removeItem("atithi_customer_token");
    localStorage.removeItem("atithi_customer");
    // The session cookie is httpOnly and can't be cleared from JS — ask the
    // server to clear it instead. Fire-and-forget: the local state above is
    // already cleared either way, so a network hiccup here isn't user-visible.
    fetch("/api/v1/auth/customer/logout", { method: "POST" }).catch(() => {});
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsUpdatingProfile(true);
    setUpdateMsg("");

    try {
      const res = await fetch("/api/v1/customer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: editName,
          email: editEmail,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setIsEditing(false);
        setUpdateMsg(isBn ? "প্রোফাইল সফলভাবে আপডেট হয়েছে!" : "Profile updated successfully!");
        fetchProfile(token);
      } else {
        setUpdateMsg(isBn ? "আপডেট করা যায়নি।" : "Failed to update profile.");
      }
    } catch {
      setUpdateMsg(isBn ? "ত্রুটি হয়েছে।" : "An error occurred.");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  // Active/Upcoming booking: not cancelled, not cleared on tour day, and departure date is not past expiry
  function isBookingActive(b: DbBooking): boolean {
    if (b.status === "cancelled" || b.status === "cleared_on_tour_day") return false;
    return isTicketVisible(b.departure_date);
  }

  // Completed booking: cleared on tour day or departure date has passed
  function isBookingCompleted(b: DbBooking): boolean {
    if (b.status === "cleared_on_tour_day") return true;
    if (b.status === "cancelled") return false;
    return !isTicketVisible(b.departure_date);
  }

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "active") {
      return isBookingActive(b);
    }
    if (bookingFilter === "cleared") {
      return isBookingCompleted(b);
    }
    return true;
  });

  const activeBookingsCount = bookings.filter(isBookingActive).length;
  const completedBookingsCount = bookings.filter(isBookingCompleted).length;

  const totalSpent = bookings.reduce(
    (acc, b) => acc + (parseFloat(b.amount_paid) || 0),
    0
  );

  return (
    <main className="relative min-h-screen overflow-hidden pb-20 pt-28 sm:pt-36">
      <Atmosphere intensity={0.2} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
            <p className="text-sm font-medium text-ink-soft">
              {isBn ? "লোড হচ্ছে…" : "Loading traveler account…"}
            </p>
          </div>
        )}

        {/* Unauthenticated State: Direct Phone Match Login (No OTP) */}
        {!isLoading && !customer && (
          <Reveal>
            <div className="mx-auto max-w-md">
              <div className="glass glass-sweep rounded-3xl p-8 sm:p-10 shadow-glass-lg border border-white/60">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald-deep text-white shadow-md">
                  <Icon name="compass" className="h-7 w-7" />
                </div>

                <h1 className="text-center font-display text-2xl sm:text-3xl font-semibold text-ink">
                  {isBn ? "ভ্রমণকারী অ্যাকাউন্ট" : "Traveler Profile"}
                </h1>
                <p className="mt-2 text-center text-sm text-ink-soft">
                  {isBn
                    ? "আপনার বুকিংয়ের সময় ব্যবহৃত মোবাইল নম্বরটি লিখুন। তাত্ক্ষণিক ম্যাচ করে আপনার বুকিং হিস্টোরি ও ডিজিটাল ট্রিপ পাস দেখুন।"
                    : "Enter the mobile number you used while booking to access your trip history, digital booking passes, and account activity."}
                </p>

                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      {isBn ? "মোবাইল নম্বর" : "Mobile Phone Number"}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder={isBn ? "০১৭১১-২২৩৩৪৪" : "017XXXXXXXX or +88017XXXXXXXX"}
                        className="w-full rounded-xl border border-white/60 bg-white/90 px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-emerald-deep focus:ring-2 focus:ring-emerald/20 font-mono"
                      />
                    </div>
                  </div>

                  {isRegisterMode && (
                    <div className="animate-in fade-in duration-200">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        {isBn ? "আপনার পুরো নাম" : "Your Full Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder={isBn ? "উদা: কাজী মিনহাজুল ইসলাম অর্ক" : "e.g. Kazi Minhazul Islam Arko"}
                        className="w-full rounded-xl border border-white/60 bg-white/90 px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-emerald-deep focus:ring-2 focus:ring-emerald/20"
                      />
                    </div>
                  )}

                  {loginError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
                      <p className="font-semibold">{loginError}</p>
                      {!isRegisterMode && (
                        <>
                          <p className="mt-1 text-rose-600">
                            {isBn
                              ? "নতুন ভ্রমণকারী? আপনার নাম লিখে সহজেই প্রোফাইল তৈরি করতে পারেন।"
                              : "New traveler? You can easily create an account with your name."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsRegisterMode(true);
                              setLoginError("");
                            }}
                            className="mt-2 text-xs font-bold text-emerald-deep underline hover:text-emerald"
                          >
                            {isBn ? "নতুন অ্যাকাউন্ট তৈরি করুন →" : "Create a new account now →"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingLogin}
                    className="w-full rounded-xl bg-emerald-deep px-4 py-3.5 font-medium text-white shadow-md transition hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isSubmittingLogin ? (
                      <span>{isBn ? "যাচাই করা হচ্ছে…" : "Processing…"}</span>
                    ) : (
                      <>
                        <span>
                          {isRegisterMode
                            ? (isBn ? "অ্যাকাউন্ট তৈরি ও প্রবেশ করুন" : "Create Account & Sign In")
                            : (isBn ? "প্রবেশ করুন" : "Sign In to My Account")}
                        </span>
                        <Icon name="arrow" className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(!isRegisterMode);
                        setLoginError("");
                      }}
                      className="text-xs font-semibold text-emerald-deep hover:underline"
                    >
                      {isRegisterMode
                        ? (isBn ? "← ইতোমধ্যে বুকিং বা অ্যাকাউন্ট আছে? লগইন করুন" : "← Already have an account? Sign in directly")
                        : (isBn ? "নতুন ভ্রমণকারী? প্রোফাইল তৈরি করুন →" : "New traveler? Create your profile →")}
                    </button>
                  </div>
                </form>

                <div className="mt-6 border-t border-ink/5 pt-6 text-center">
                  <p className="text-xs text-ink-faint">
                    {isBn
                      ? "💡 কোনো পাসওয়ার্ড বা ওটিপির ঝামেলা নেই — বুকিংয়ে ব্যবহৃত নম্বর সরাসরি ম্যাচ করলেই অ্যাক্সেস পেয়ে যাবেন।"
                      : "💡 Zero friction: No password or OTP required. Simply enter your booked phone number to access your tours."}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Authenticated Customer Profile */}
        {!isLoading && customer && (
          <div className="space-y-8">
            {/* Customer Header Card */}
            <Reveal>
              <div className="glass glass-sweep rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-glass border border-white/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald-deep text-xl sm:text-3xl font-bold text-white shadow-md">
                      {customer.full_name?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-xl sm:text-3xl font-semibold text-ink">
                          {customer.full_name}
                        </h1>
                        <span className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-deep">
                          {isBn ? "যাচাইকৃত পর্যটক" : "Verified Traveler"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:text-sm text-ink-soft">
                        <span className="font-mono font-medium">{customer.phone_number}</span>
                        {customer.email && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate max-w-[180px] sm:max-w-none">{customer.email}</span>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span>
                          {isBn ? "যুক্ত হয়েছেন: " : "Member since: "}
                          {formatDate(customer.created_at, isBn)}
                        </span>
                      </div>
                      {customer.preferred_pickup_point && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                          
                          <span>{isBn ? "পছন্দের বোর্ডিং পয়েন্ট: " : "Preferred Pick-up: "}</span>
                          <span className="font-semibold text-ink">{customer.preferred_pickup_point}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Logout */}
                  <div className="flex items-center gap-2 sm:self-start mt-2 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-ink-soft backdrop-blur transition hover:bg-white hover:text-ink"
                    >
                      {isEditing ? (isBn ? "বাতিল" : "Cancel") : (isBn ? "প্রোফাইল সম্পাদনা" : "Edit Profile")}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      {isBn ? "লগ আউট" : "Sign Out"}
                    </button>
                  </div>
                </div>

                {/* Edit Profile Form Drawer */}
                {isEditing && (
                  <form
                    onSubmit={handleUpdateProfile}
                    className="mt-5 rounded-2xl border border-white/80 bg-white/70 p-4 sm:p-5 shadow-sm space-y-4"
                  >
                    <h3 className="text-sm font-semibold text-ink">
                      {isBn ? "ব্যক্তিগত তথ্য পরিবর্তন করুন" : "Update Traveler Details"}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1">
                          {isBn ? "পূর্ণ নাম" : "Full Name"}
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-white/60 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-emerald-deep"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1">
                          {isBn ? "ইমেইল (ঐচ্ছিক)" : "Email Address (Optional)"}
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full rounded-xl border border-white/60 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-emerald-deep"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="rounded-xl bg-emerald-deep px-4 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        {isUpdatingProfile
                          ? (isBn ? "সংরক্ষণ হচ্ছে…" : "Saving…")
                          : (isBn ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes")}
                      </button>
                      {updateMsg && <span className="text-xs text-emerald-700 font-medium">{updateMsg}</span>}
                    </div>
                  </form>
                )}

                {/* Quick Statistics Strip */}
                <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 border-t border-ink/5 pt-5 sm:pt-6">
                  <div className="rounded-xl sm:rounded-2xl border border-white/60 bg-white/50 p-3 sm:p-4">
                    <p className="text-[11px] sm:text-xs text-ink-soft font-medium">
                      {isBn ? "মোট বুকিং" : "Total Bookings"}
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-ink">
                      {bookings.length}
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl border border-white/60 bg-white/50 p-3 sm:p-4">
                    <p className="text-[11px] sm:text-xs text-ink-soft font-medium">
                      {isBn ? "আসন্ন ট্যুর" : "Active / Upcoming"}
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-emerald-deep">
                      {activeBookingsCount}
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl border border-white/60 bg-white/50 p-3 sm:p-4">
                    <p className="text-[11px] sm:text-xs text-ink-soft font-medium">
                      {isBn ? "সম্পন্ন ভ্রমণ" : "Completed Journeys"}
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-ink">
                      {completedBookingsCount}
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl border border-white/60 bg-white/50 p-3 sm:p-4">
                    <p className="text-[11px] sm:text-xs text-ink-soft font-medium">
                      {isBn ? "পরিশোধিত অর্থ" : "Total Paid"}
                    </p>
                    <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-ink">
                      {formatBDT(totalSpent)}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Recent Tour E-Ticket Showcase */}
            {bookings.length > 0 && (() => {
              const recentBooking = bookings[0];
              const isRecentTicketVisible = isTicketVisible(recentBooking.departure_date);
              const statusInfo = getTicketVisibilityStatus(recentBooking.departure_date, isBn);
              const seats = recentBooking.selected_seats || [];

              return (
                <Reveal>
                  <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-emerald-800/30 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 sm:p-7 text-white shadow-xl">
                    {/* Background decorative watermark */}
                    <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-10 select-none">
                      <img src="/images/logo-badge.png" alt="Watermark" className="w-56 h-56 object-contain grayscale" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-amber-400/20 border border-amber-300/30 px-2.5 py-1 text-xs font-bold text-amber-300">
                            🎟️ {isBn ? "সাম্প্রতিক বুক করা ট্যুর" : "Recent Tour Booked"}
                          </span>
                          <span className="font-mono text-xs text-slate-300">
                            {recentBooking.reference}
                          </span>
                        </div>

                        {/* Visibility Status Badge */}
                        <div>
                          {isRecentTicketVisible ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                              {isBn ? "টিকিট ডাউনলোড সক্রিয় (যাত্রার পরদিন পর্যন্ত)" : "Ticket Download Active (Until Day After Departure)"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-[11px] font-semibold text-amber-200">
                              <Icon name="clock" className="h-3 w-3 text-amber-300" />
                              {isBn ? "যাত্রার পরের দিন অতিক্রম করায় মেয়াদ শেষ" : "Expired Day After Departure"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 items-center">
                        <div className="sm:col-span-2 space-y-2">
                          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                            {recentBooking.tour_title}
                          </h2>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-300">
                            <span>
                              📅 <strong>{isBn ? "যাত্রার তারিখ: " : "Departure: "}</strong>
                              <span className="text-white font-medium">{formatDate(recentBooking.departure_date, isBn)}</span>
                            </span>
                            <span>•</span>
                            <span>
                              👥 <strong>{isBn ? "যাত্রী: " : "Travelers: "}</strong>
                              <span className="text-white font-medium">{recentBooking.traveler_count} {isBn ? "জন" : "person(s)"}</span>
                            </span>
                            {seats.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  💺 <strong>{isBn ? "আসন: " : "Seats: "}</strong>
                                  <span className="font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                    {seats.join(", ")}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>

                          {recentBooking.pickup_point && (
                            <p className="text-xs text-slate-300">
                              📍 <strong>{isBn ? "পিক-আপ পয়েন্ট: " : "Pick-up Point: "}</strong>
                              <span className="text-white">{recentBooking.pickup_point}</span>
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:items-end justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                          {isRecentTicketVisible ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedTicketBooking(recentBooking)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg transition active:scale-95"
                              >
                                <Icon name="ticket" className="h-4 w-4" />
                                <span>{isBn ? "টিকিট ডাউনলোড করুন" : "Download E-Ticket"}</span>
                              </button>

                              <Link
                                href={`/tickets/${recentBooking.id}?print=true`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition"
                              >
                                <Icon name="receipt" className="h-3.5 w-3.5" />
                                <span>{isBn ? "🖨️ সরাসরি প্রিন্ট / PDF" : "🖨️ Quick Print / PDF"}</span>
                              </Link>
                            </>
                          ) : (
                            <div className="text-xs text-amber-300/80 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-center sm:text-right">
                              <p className="font-semibold">{statusInfo.message}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {isBn ? "যাত্রার পরদিন পর্যন্ত টিকিট ডাউনলোড কার্যকর থাকে" : "Tickets are valid until 1 day post-departure"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })()}

            {/* Tab Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3 sm:pb-4">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-scroll pb-1 sm:pb-0 w-full sm:w-auto -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("bookings")}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeTab === "bookings"
                      ? "bg-emerald-deep text-white shadow-sm"
                      : "bg-white/70 text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon name="compass" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{isBn ? "বুকিং হিস্টোরি" : "Booking History"}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                      activeTab === "bookings"
                        ? "bg-white/20 text-white"
                        : "bg-ink/5 text-ink-soft"
                    }`}
                  >
                    {bookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeTab === "activity"
                      ? "bg-emerald-deep text-white shadow-sm"
                      : "bg-white/70 text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon name="clock" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{isBn ? "অ্যাক্টিভিটি" : "Activity Log"}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                      activeTab === "activity"
                        ? "bg-white/20 text-white"
                        : "bg-ink/5 text-ink-soft"
                    }`}
                  >
                    {activities.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("support")}
                  className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                    activeTab === "support"
                      ? "bg-emerald-deep text-white shadow-sm"
                      : "bg-white/70 text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  <Icon name="shield" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{isBn ? "হোস্ট ও সহায়তা" : "Host & Support"}</span>
                </button>
              </div>

              {/* Sub-filters for Bookings Tab */}
              {activeTab === "bookings" && bookings.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto no-scrollbar touch-scroll">
                  <button
                    type="button"
                    onClick={() => setBookingFilter("all")}
                    className={`rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 transition whitespace-nowrap ${
                      bookingFilter === "all"
                        ? "bg-ink text-white"
                        : "bg-white/60 text-ink-soft hover:bg-white"
                    }`}
                  >
                    {isBn ? "সকল" : "All"} ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingFilter("active")}
                    className={`rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 transition whitespace-nowrap ${
                      bookingFilter === "active"
                        ? "bg-emerald-deep text-white"
                        : "bg-white/60 text-ink-soft hover:bg-white"
                    }`}
                  >
                    {isBn ? "আসন্ন" : "Active"} ({activeBookingsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingFilter("cleared")}
                    className={`rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 transition whitespace-nowrap ${
                      bookingFilter === "cleared"
                        ? "bg-purple-700 text-white"
                        : "bg-white/60 text-ink-soft hover:bg-white"
                    }`}
                  >
                    {isBn ? "সম্পন্ন" : "Cleared"} ({completedBookingsCount})
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: Booking History Details */}
            {activeTab === "bookings" && (
              <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                  <div className="glass rounded-3xl p-10 text-center border border-white/60">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10 text-emerald-deep">
                      <Icon name="compass" className="h-7 w-7" />
                    </span>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {isBn ? "কোনো বুকিং পাওয়া যায়নি" : "No Bookings Found"}
                    </h3>
                    <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
                      {isBn
                        ? "আপনি এখনো কোনো ট্যুর বুক করেননি। আমাদের আকর্ষনীয় ভ্রমণ প্যাকেজগুলো দেখুন এবং বুক করুন।"
                        : "Ready for an authentic experience? Explore our curated departures across Bangladesh."}
                    </p>
                    <Link
                      href="/tours"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-deep px-5 py-2.5 font-medium text-white shadow-md hover:brightness-110 transition"
                    >
                      <span>{isBn ? "ট্যুর সমূহ এক্সপ্লোর করুন" : "Explore Tour Packages"}</span>
                      <Icon name="arrow" className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  filteredBookings.map((b) => {
                    const total = parseFloat(b.total_price) || 0;
                    const paid = parseFloat(b.amount_paid) || 0;
                    const due = parseFloat(b.amount_due) || 0;

                    let statusBadge = {
                      text: isBn ? "পেমেন্ট অপেক্ষমাণ" : "Pending Payment",
                      classes: "bg-amber-100 text-amber-800 border-amber-200",
                    };

                    if (b.status === "pending_cash_approval") {
                      statusBadge = {
                        text: isBn ? "নগদ অনুমোদন অপেক্ষমাণ (১০ মিনিট)" : "Pending Cash Approval (10m)",
                        classes: "bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse",
                      };
                    } else if (b.status === "confirmed_advance_paid") {
                      statusBadge = {
                        text: isBn ? "নিশ্চিত (অগ্রিম পরিশোধিত)" : "Confirmed (Advance Paid)",
                        classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
                      };
                    } else if (b.status === "confirmed_fully_paid") {
                      statusBadge = {
                        text: isBn ? "নিশ্চিত (সম্পূর্ণ পরিশোধিত)" : "Confirmed (Fully Paid)",
                        classes: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold",
                      };
                    } else if (b.status === "cleared_on_tour_day") {
                      statusBadge = {
                        text: isBn ? "ট্যুর সম্পন্ন (ক্লিয়ার্ড)" : "Cleared on Tour Day",
                        classes: "bg-purple-100 text-purple-800 border-purple-200",
                      };
                    } else if (b.status === "cancelled") {
                      statusBadge = {
                        text: isBn ? "বাতিলকৃত" : "Cancelled",
                        classes: "bg-rose-100 text-rose-800 border-rose-200",
                      };
                    }

                    const isCashPayment = b.advance_payment_method === "cash_on_hand" || b.payment_method === "cash_on_hand" || b.payment_method === "cash";

                    return (
                      <div
                        key={b.id}
                        className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-glass border border-white/60 transition hover:shadow-glass-lg"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold uppercase tracking-wider bg-ink/5 border border-ink/10 px-2.5 py-1 rounded-lg text-ink">
                                {b.reference}
                              </span>
                              <span
                                className={`text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusBadge.classes}`}
                              >
                                {statusBadge.text}
                              </span>
                              {isCashPayment ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                                  💵 {isBn ? "অগ্রিম: হাতে নগদ" : "Advance: Hand Cash"}
                                </span>
                              ) : b.advance_payment_method === "Rocket payment" || b.payment_method === "Rocket payment" ? (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
                                  🚀 {isBn ? "অগ্রিম: রকেট পেমেন্ট" : "Advance: Rocket payment"}
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-900 border border-pink-200">
                                  📱 {isBn ? "অগ্রিম: বিকাশ পেমেন্ট" : "Advance: Bkash payment"}
                                </span>
                              )}

                              {b.due_payment_method === "cash_on_hand" && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300">
                                  💵 {isBn ? "বকেয়া: ট্যুর দিনে নগদ" : "Due: Cash on Tour Day"}
                                </span>
                              )}
                              {b.due_payment_method === "Rocket payment" && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
                                  🚀 {isBn ? "বকেয়া: রকেট পেমেন্ট" : "Due: Rocket payment"}
                                </span>
                              )}
                              {b.due_payment_method && b.due_payment_method !== "cash_on_hand" && b.due_payment_method !== "Rocket payment" && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-900 border border-pink-200">
                                  📱 {isBn ? "বকেয়া: বিকাশ পেমেন্ট" : "Due: Bkash payment"}
                                </span>
                              )}
                            </div>

                            <h2 className="font-display text-lg sm:text-2xl font-semibold text-ink">
                              {b.tour_title}
                            </h2>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-ink-soft">
                              <span>
                                📅 <strong>{isBn ? "যাত্রার তারিখ: " : "Departure: "}</strong>
                                {formatDate(b.departure_date, isBn)}
                              </span>
                              <span>•</span>
                              <span>
                                👥 <strong>{isBn ? "যাত্রী: " : "Travelers: "}</strong>
                                {b.traveler_count} {isBn ? "জন" : "person(s)"}
                              </span>
                              {b.selected_seats && b.selected_seats.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>
                                    💺 <strong>{isBn ? "সিট: " : "Seats: "}</strong>
                                    <span className="font-semibold text-emerald-800">
                                      {b.selected_seats.join(", ")}
                                    </span>
                                  </span>
                                </>
                              )}
                              {b.pickup_point && (
                                <>
                                  <span>•</span>
                                  <span>
                                    📍 <strong>{isBn ? "পিক-আপ: " : "Pick-up: "}</strong>
                                    <span className="font-semibold text-ink">
                                      {b.pickup_point}
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Pending Cash Approval 10-Minute Alert Box */}
                            {b.status === "pending_cash_approval" && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 sm:p-3.5 my-2 space-y-1.5 animate-in fade-in">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <span>⏳</span>
                                    <span>{isBn ? "অ্যাডমিন অনুমোদনের সময় বাকি:" : "Cash Approval Window Remaining:"}</span>
                                  </span>
                                  <ProfileCashCountdown expiresAt={b.cash_approval_expires_at} isBn={isBn} />
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  {isBn
                                    ? "নিরাপত্তার স্বার্থে, ১০ মিনিটের মধ্যে সাভার অফিস কাউন্টারে বা ট্যুর পরিচালকের কাছে নগদ টাকা বুঝিয়ে দিন। নির্ধারিত সময়ের মধ্যে অ্যাডমিন অনুমোদন না করলে আসনটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।"
                                    : "For anti-hoarding security, please hand over physical cash at the Savar office counter or to your tour representative. The admin must verify and approve it within 10 minutes or your reserved seats will be automatically released."}
                                </p>
                              </div>
                            )}

                            {b.cash_approved_by && (
                              <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1 mt-1">
                                <span>✓</span>
                                <span>{isBn ? `নগদ পেমেন্ট অনুমোদিত (${b.cash_approved_by})` : `Cash Payment Verified & Approved (${b.cash_approved_by})`}</span>
                              </div>
                            )}

                            {b.status === "cancelled" && b.special_requests?.includes("10-minute") && (
                              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium my-1.5">
                                ⚠️ {isBn ? "১০ মিনিটের নির্ধারিত সময়ে নগদ টাকা অনুমোদন না করায় রিজার্ভেশনটি স্বয়ংক্রিয়ভাবে বাতিল হয়েছে।" : "Auto-cancelled: Physical cash was not approved within the 10-minute security window."}
                              </div>
                            )}
                          </div>

                          {/* Payment Summary Box */}
                          <div className="flex flex-col rounded-xl sm:rounded-2xl bg-white/70 p-3.5 sm:p-4 border border-white/80 sm:min-w-[220px]">
                            <div className="flex justify-between text-xs text-ink-soft mb-1">
                              <span>{isBn ? "মোট প্যাকেজ মূল্য" : "Total Price"}:</span>
                              <span className="font-semibold text-ink">{formatBDT(total)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-emerald-800 mb-1">
                              <span>{isBn ? "পরিশোধিত" : "Amount Paid"}:</span>
                              <span className="font-bold">{formatBDT(paid)}</span>
                            </div>
                            {due > 0 ? (
                              <div className="flex justify-between text-xs text-amber-900 border-t border-ink/5 pt-1 mt-1 font-bold">
                                <span>{isBn ? "ট্যুর দিনে প্রদেয়" : "Due on Tour Day"}:</span>
                                <span>{formatBDT(due)}</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center text-xs border-t border-ink/5 pt-1.5 mt-1 font-bold">
                                <span className="text-slate-600">{isBn ? "অবশিষ্ট বকেয়া" : "Due Balance"}:</span>
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                  <span className="font-extrabold">{formatBDT(0)}</span>
                                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                    ✓ {isBn ? "সম্পূর্ণ পরিশোধিত" : "Fully Paid"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 border-t border-ink/5 pt-4">
                          {/* E-Ticket Download / Print Action (Visible until day after departure) */}
                          {isTicketVisible(b.departure_date) ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTicketBooking(b)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 w-full sm:w-auto"
                            >
                              <Icon name="ticket" className="h-4 w-4 text-amber-300" />
                              <span>{isBn ? "টিকিট ডাউনলোড / প্রিন্ট" : "Download Ticket"}</span>
                            </button>
                          ) : (
                            <span
                              title={isBn ? "যাত্রার পরের দিন অতিক্রম করায় ডাউনলোডের মেয়াদ শেষ হয়েছে" : "Ticket download expired the day after departure"}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 px-3.5 py-2 text-xs font-medium text-slate-500 w-full sm:w-auto cursor-help"
                            >
                              <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                              <span>{isBn ? "টিকিট মেয়াদোত্তীর্ণ" : "Ticket Expired"}</span>
                            </span>
                          )}

                          {/* 1-Click Digital Booking Pass */}
                          <Link
                            href={`/clearance/${b.id}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-deep/90 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 w-full sm:w-auto"
                          >
                            <Icon name="shield" className="h-4 w-4" />
                            <span>{isBn ? "ডিজিটাল পাস" : "Boarding Pass"}</span>
                          </Link>

                          {/* Pay Remaining Due Link (Online or Hand Cash) */}
                          {due > 0 && b.status !== "cancelled" && (
                            <Link
                              href={`/clearance/${b.id}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 w-full sm:w-auto"
                            >
                              <Icon name="sparkle" className="h-4 w-4" />
                              <span>{isBn ? "বাকি টাকা পরিশোধ করুন (অনলাইন বা নগদ)" : "Pay Due (Online or Hand Cash)"}</span>
                            </Link>
                          )}

                          {/* View Tour page */}
                          {b.tour_slug && (
                            <Link
                              href={`/tours/${b.tour_slug}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-white/70 px-4 py-2.5 text-xs font-semibold text-ink-soft transition hover:bg-white hover:text-ink w-full sm:w-auto"
                            >
                              <span>{isBn ? "ট্যুরের বিস্তারিত" : "View Tour Itinerary"}</span>
                              <Icon name="arrow" className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Activity Timeline */}
            {activeTab === "activity" && (
              <div className="glass rounded-3xl p-6 sm:p-8 shadow-glass border border-white/60">
                <h3 className="font-display text-lg font-semibold text-ink mb-6">
                  {isBn ? "আপনার সাম্প্রতিক কার্যকলাপ ও ইতিহাস" : "Your Account Activity Timeline"}
                </h3>

                {activities.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    {isBn ? "এখনো কোনো কার্যক্রম রেকর্ড করা হয়নি।" : "No activity recorded yet."}
                  </p>
                ) : (
                  <div className="relative border-l-2 border-emerald-200/80 pl-6 ml-3 space-y-6">
                    {activities.map((act) => {
                      let badgeIcon = "sparkle";
                      if (act.type === "account_created") badgeIcon = "shield";
                      if (act.type === "booking_created") badgeIcon = "compass";
                      if (act.type === "payment_completed") badgeIcon = "check";
                      if (act.type === "qr_cleared") badgeIcon = "check";

                      return (
                        <div key={act.id} className="relative group">
                          {/* Dot indicator */}
                          <div className="absolute -left-[31px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-white ring-4 ring-white shadow-sm">
                            <Icon name={badgeIcon as any} className="h-3 w-3" />
                          </div>

                          <div className="rounded-2xl border border-white/70 bg-white/60 p-4 transition group-hover:bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-semibold text-sm text-ink">{act.title}</h4>
                              <span className="font-mono text-xs text-ink-faint">
                                {formatDate(act.created_at, isBn)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                              {act.description}
                            </p>
                            {Array.isArray(act.metadata?.selected_seats) && (act.metadata.selected_seats as string[]).length > 0 && (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                💺 {isBn ? "সিট নম্বর: " : "Seats: "} {(act.metadata.selected_seats as string[]).join(", ")}
                              </div>
                            )}
                            {typeof act.metadata?.pickup_point === "string" && (
                              <div className="mt-2 ml-1.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                                📍 {isBn ? "পিক-আপ: " : "Pick-up: "} {act.metadata.pickup_point}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Support & Concierge */}
            {activeTab === "support" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="glass rounded-3xl p-6 sm:p-8 shadow-glass border border-white/60 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-emerald-deep">
                    <Icon name="shield" className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {isBn ? "সাভার ট্যুর লাভার ভ্রমণ সহকারী ও হটলাইন" : "Savar Tour Lover Traveler Concierge"}
                  </h3>
                  <p className="text-sm text-ink-soft leading-relaxed">
                    {isBn
                      ? "আপনার যেকোনো যাত্রা সম্পর্কিত প্রশ্ন, পৌঁছানোর পয়েন্ট নির্দেশনা বা বিশেষ রিকোয়েস্টের জন্য আমাদের ডেডিকেটেড টিম সবসময় পাশে রয়েছে।"
                      : "Have questions regarding departure meeting points, itinerary adjustments, or on-tour assistance? Our concierge team is on call."}
                  </p>
                  <div className="space-y-2 pt-2 text-sm">
                    <p className="font-semibold text-ink">
                      📞 {isBn ? "হটলাইন: " : "Direct Helpline: "}
                      <span className="font-mono text-emerald-deep font-bold">+880 1700-000000</span>
                    </p>
                    <p className="font-semibold text-ink">
                      💬 {isBn ? "হোয়াটসঅ্যাপ সাপোর্ট: " : "WhatsApp Support: "}
                      <a
                        href="https://wa.me/8801700000000"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-deep underline"
                      >
                        +880 1700-000000
                      </a>
                    </p>
                  </div>
                </div>

                <div className="glass rounded-3xl p-6 sm:p-8 shadow-glass border border-white/60 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                    <Icon name="sparkle" className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {isBn ? "ট্যুর দিনে বুকিং ও পেমেন্ট কীভাবে কাজ করে?" : "How On-Tour Check-in & Payment Works"}
                  </h3>
                  <p className="text-sm text-ink-soft leading-relaxed">
                    {isBn
                      ? "১. অগ্রিম ৪০% পরিশোধের মাধ্যমে আপনার আসন নিশ্চিত হয়।\n২. যাত্রার দিন সকালে আপনার লোকাল ট্যুর হোস্ট আপনার বুকিং ভাউচার ও নাম নিশ্চিত করবেন।\n৩. বাকি টাকা আপনি সরাসরি বিকাশ/কার্ড দিয়ে অথবা হোস্টকে ক্যাশ দিয়ে পরিশোধ করতে পারবেন।"
                      : "1. 40% advance confirms your seats upfront with zero middleman.\n2. On the morning of your trip, your dedicated local host verifies your booking pass and voucher.\n3. Settle any remaining balance digitally via bKash/Nagad/Card or cash directly on spot."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official E-Ticket & Boarding Pass Download Modal */}
      <TourTicketModal
        booking={selectedTicketBooking}
        isOpen={!!selectedTicketBooking}
        onClose={() => setSelectedTicketBooking(null)}
        isBn={isBn}
      />
    </main>
  );
}
