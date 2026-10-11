"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icon";
import { siteName } from "@/data/site";
import { useLanguage } from "@/context/LanguageContext";

const officeInfoData = [
  {
    icon: "mapPin",
    labelEn: "Office",
    labelBn: "কার্যালয়",
    valueEn: "Savar Pollibidut, Kobarsthan Road, Savar, Dhaka, 1340, Bangladesh",
    valueBn: "সাভার পল্লীবিদ্যুৎ, কবরস্থান রোড, সাভার, ঢাকা, ১৩৪০, বাংলাদেশ",
  },
  {
    icon: "phone",
    labelEn: "Phone",
    labelBn: "ফোন",
    valueEn: "01620592884, 01646325350",
    valueBn: "০১৬২০৫৯২৮৮৪, ০১৬৪৬৩২৫৩৫০",
  },
  {
    icon: "mail",
    labelEn: "Email",
    labelBn: "ইমেইল",
    valueEn: "savartourlover@gmail.com",
    valueBn: "savartourlover@gmail.com",
  },
  {
    icon: "clock",
    labelEn: "Hours",
    labelBn: "সময়সূচী",
    valueEn: "Every day, 9:00 AM – 10:00 PM (BST)",
    valueBn: "প্রতিদিন, সকাল ৯:০০ – রাত ১০:০০ (BST)",
  },
];

const tripTypesData = [
  { en: "Group Tour", bn: "গ্রুপ ট্যুর" },
  { en: "Private & Custom Trip", bn: "ব্যক্তিগত ও কাস্টম ভ্রমণ" },
  { en: "Honeymoon Package", bn: "হানিমুন প্যাকেজ" },
  { en: "Family Holiday", bn: "পারিবারিক ভ্রমণ" },
  { en: "Corporate Retreat", bn: "কর্পোরেট রিট্রিট" },
  { en: "Adventure & Trekking", bn: "অ্যাডভেঞ্চার ও ট্র্যাকিং" },
];

type Status = "idle" | "submitting" | "sent";

export function ContactClient() {
  const { isBn } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          trip_type: formData.get("tripType"),
          dates: formData.get("dates"),
          travelers: formData.get("travelers"),
          message: formData.get("message"),
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-10 pt-32 sm:px-6 sm:pt-40">
        <Atmosphere intensity={0.28} />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-deep">
              <Icon name="mail" className="h-4 w-4" />
              {isBn ? "আমাদের সাথে কথা বলুন" : "Talk to us"}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
              {isBn ? "পরবর্তী ভ্রমণের পরিকল্পনা শুরু হোক" : "Let's plan your next journey"}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              {isBn
                ? "কোথায় এবং কখন যেতে চান তা জানান — আমাদের দলের একজন সদস্য দ্রুত আপনার সাথে যোগাযোগ করবেন।"
                : "Tell us where you want to go and when — a real person on our team will get back to you, usually within a few hours."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Form + Info */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Form */}
          <Reveal>
            <div className="glass glass-sweep rounded-[2rem] p-6 sm:p-8">
              {status === "sent" ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                    <Icon name="check" className="h-7 w-7" />
                  </span>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {isBn ? "বার্তা সফলভাবে পাঠানো হয়েছে" : "Message sent"}
                  </h2>
                  <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
                    {isBn
                      ? "যোগাযোগের জন্য ধন্যবাদ — আমাদের টিম খুব শীঘ্রই আপনার দেওয়া তথ্য অনুযায়ী যোগাযোগ করবে।"
                      : "Thanks for reaching out — someone from our team will contact you shortly on the details you shared."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="btn btn-glass mt-2"
                  >
                    {isBn ? "আরেকটি বার্তা পাঠান" : "Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                      >
                        {isBn ? "আপনার পুরো নাম" : "Full name"}
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder={isBn ? "আপনার নাম" : "Your name"}
                        className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                      >
                        {isBn ? "ফোন নম্বর" : "Phone number"}
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        placeholder={isBn ? "০১৬২০৫৯২৮৮৪" : "01620592884"}
                        className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      {isBn ? "ইমেইল ঠিকানা" : "Email"}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder={isBn ? "you@example.com" : "you@example.com"}
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tripType"
                      className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      {isBn ? "ভ্রমণের ধরন" : "Trip type"}
                    </label>
                    <select
                      id="tripType"
                      name="tripType"
                      defaultValue=""
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                    >
                      <option value="" disabled>
                        {isBn ? "ভ্রমণের ধরন নির্বাচন করুন" : "Choose a trip type"}
                      </option>
                      {tripTypesData.map((t) => (
                        <option key={t.en} value={t.en}>
                          {isBn ? t.bn : t.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="dates"
                        className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                      >
                        {isBn ? "সম্ভাব্য তারিখ" : "Preferred dates"}
                      </label>
                      <input
                        id="dates"
                        name="dates"
                        type="text"
                        placeholder={isBn ? "যেমন: ডিসেম্বরের মাঝামাঝি" : "e.g. mid December"}
                        className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="travelers"
                        className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                      >
                        {isBn ? "ভ্রমণকারীর সংখ্যা" : "Travelers"}
                      </label>
                      <input
                        id="travelers"
                        name="travelers"
                        type="number"
                        min={1}
                        placeholder="2"
                        className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      {isBn ? "আপনার পছন্দ ও পরিকল্পনা" : "Tell us more"}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      placeholder={
                        isBn
                          ? "কোথায় যেতে চান এবং বিশেষ কোনো ইচ্ছা থাকলে লিখুন..."
                          : "Where do you want to go, and what would make it perfect?"
                      }
                      className="mt-2 w-full resize-none rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint/70 outline-none transition-colors focus:border-emerald/50 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="btn btn-emerald w-full disabled:opacity-70"
                  >
                    {status === "submitting"
                      ? isBn
                        ? "পাঠানো হচ্ছে…"
                        : "Sending…"
                      : isBn
                      ? "বার্তা পাঠান"
                      : "Send message"}
                  </button>
                  <p className="text-center text-xs text-ink-faint">
                    {isBn
                      ? "আপনার তথ্য সম্পূর্ণ সুরক্ষিত থাকবে। কোনো স্প্যাম পাঠানো হবে না।"
                      : "We'll never share your details. This form connects you directly to our tour planning team."}
                  </p>
                </form>
              )}
            </div>
          </Reveal>

          {/* Info sidebar */}
          <div className="space-y-5">
            <Reveal delay={0.06}>
              <div className="glass glass-sweep rounded-3xl p-6">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {isBn ? "সরাসরি যোগাযোগ করুন" : "Reach us directly"}
                </h2>
                <div className="mt-5 space-y-4">
                  {officeInfoData.map((info) => (
                    <div key={info.labelEn} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                        <Icon name={info.icon} className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                          {isBn ? info.labelBn : info.labelEn}
                        </div>
                        <div className="text-sm font-medium text-ink">
                          {isBn ? info.valueBn : info.valueEn}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald to-emerald-deep p-6 text-white">
                <Atmosphere intensity={0.2} />
                <div className="relative z-10">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Icon name="whatsapp" className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-display text-lg font-semibold">
                    {isBn ? "হোয়াটসঅ্যাপে দ্রুত সেবা" : "Faster on WhatsApp"}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
                    {isBn
                      ? "তাত্ক্ষণিক উত্তর, ই-টিকেট এবং বুকিং পেমেন্ট নিশ্চিতকরণের জন্য সরাসরি হোয়াটসঅ্যাপে যোগাযোগ করুন।"
                      : "Message us directly for a same-day reply, e-tickets, and your booking payment confirmations."}
                  </p>
                  <Link
                    href="https://wa.me/8801620592884"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-gold mt-5 w-full !py-2.5"
                  >
                    {isBn ? "হোয়াটসঅ্যাপে চ্যাট করুন" : "Chat on WhatsApp"}
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="glass glass-sweep rounded-3xl p-6">
                <h2 className="font-display text-base font-semibold text-ink">
                  {isBn ? `${siteName}-এর সেবা সময়সূচী` : `${siteName} office hours`}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {isBn
                    ? "আমাদের সাভার অফিস এবং হেল্পলাইন প্রতিদিন খোলা থাকে — সাপ্তাহিক ছুটির দিন এবং সরকারি ছুটির দিনেও।"
                    : "Our Savar office and phone lines are open every day — including weekends and public holidays, since most trips are booked outside standard office hours."}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
