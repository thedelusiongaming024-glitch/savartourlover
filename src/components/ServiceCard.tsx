"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { Service } from "@/lib/types";

interface ServiceCardProps {
  service: Service;
}

const BENGALI_SERVICES: Record<string, { title: string; description: string }> = {
  "group tours": {
    title: "গ্রুপ ট্যুর",
    description: "সারা বাংলাদেশে রোমাঞ্চকর গ্রুপ ট্যুর, অভিজ্ঞ লোকাল হোস্টের তত্ত্বাবধানে অল-ইনক্লুসিভ প্যাকেজ।",
  },
  "private & custom trips": {
    title: "ব্যক্তিগত ও কাস্টম ভ্রমণ",
    description: "আপনার পছন্দসই তারিখ, সময় ও বাজেট অনুযায়ী সম্পূর্ণ কাস্টমাইজড ভ্রমণ পরিকল্পনা।",
  },
  "honeymoon packages": {
    title: "হানিমুন প্যাকেজ",
    description: "সমুদ্রঘেঁষা স্যুট, ক্যান্ডেললাইট ডিনার ও একান্ত মুহূর্ত — দুজনার জন্য স্মরণীয় আয়োজন।",
  },
  "family holidays": {
    title: "পারিবারিক ভ্রমণ",
    description: "বাচ্চা ও বয়োবৃদ্ধদের উপযোগী নিরাপদ পরিবহন ও নির্বিঘ্ন সেবা, যাতে পরিবারের সবাই নিশ্চিন্তে উপভোগ করতে পারে।",
  },
  "corporate retreats": {
    title: "কর্পোরেট রিট্রিট",
    description: "পাহাড় বা সমুদ্রে অফিসিয়াল টিম ট্যুর, নিখুঁত লজিস্টিকস ও টিম-বিল্ডিং আয়োজনের সমন্বয়ে।",
  },
  "adventure & trekking": {
    title: "অ্যাডভেঞ্চার ও ট্র্যাকিং",
    description: "পাহাড়ের গভীর ট্রেইল, ম্যানগ্রোভ ক্রুজ ও অফ-বিট রোমাঞ্চ — অভিজ্ঞ ট্র্যাকার ও গাইড সহ।",
  },
};

export function ServiceCard({ service }: ServiceCardProps) {
  const { isBn } = useLanguage();

  let displayTitle = service.title;
  let displayDesc = service.description;

  if (isBn) {
    const key = service.title.toLowerCase();
    const matched = Object.keys(BENGALI_SERVICES).find((k) => key.includes(k) || k.includes(key));
    if (matched) {
      displayTitle = BENGALI_SERVICES[matched].title;
      displayDesc = BENGALI_SERVICES[matched].description;
    }
  }

  return (
    <GlassCard
      lift={6}
      className="glass glass-sweep group flex h-full flex-col rounded-3xl p-6 shadow-glass transition-shadow duration-300 hover:shadow-glass-lg"
    >
      <motion.span
        whileHover={{ scale: 1.12, rotate: 6 }}
        transition={{ type: "spring", stiffness: 400, damping: 16 }}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald-deep text-white shadow-md"
      >
        <Icon name={service.icon} className="h-6 w-6" />
      </motion.span>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">
        {displayTitle}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {displayDesc}
      </p>
    </GlassCard>
  );
}
