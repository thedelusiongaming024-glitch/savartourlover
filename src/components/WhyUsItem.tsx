"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Icon } from "@/components/Icon";

interface WhyUsItemProps {
  title: string;
  description: string;
  icon: string;
}

const BENGALI_WHY_US: Record<string, { title: string; description: string }> = {
  "local hosts": {
    title: "লোকাল হোস্ট, কোনো মধ্যস্থতাকারী নয়",
    description:
      "প্রতিটি ট্যুর পরিচালিত হয় স্থানীয় অভিজ্ঞদের দ্বারা, যারা সেই অঞ্চলটিকে নিজের বাড়ির মতোই চেনেন এবং স্থানীয় মাঝি, ড্রাইভার ও রিসোর্টের সাথে সরাসরি যুক্ত।",
  },
  "instant booking": {
    title: "সহজ ও স্বচ্ছ বুকিং",
    description:
      "ব্রাউজিং থেকে কয়েক মিনিটেই অফিসিয়াল ই-টিকেট। ভাউচার, ডিজিটাল টিকেট ও সকল রিমাইন্ডার পৌঁছে যায় হোয়াটসঅ্যাপ ও ইমেইলে।",
  },
  "24/7 support": {
    title: "সার্বক্ষণিক ২৪/৭ মানবিক সহায়তা",
    description:
      "কোনো রোবট বা চ্যাটবট নয় — পুরো ভ্রমণ জুড়ে আমাদের ডেডিকেটেড টিম হোয়াটসঅ্যাপে সবসময় পাশে থাকবে।",
  },
  "money, fully accounted": {
    title: "শতভাগ স্বচ্ছ লেনদেন",
    description:
      "প্রতিটি লেনদেনের ডিজিটাল ট্র্যাকিং ও তাৎক্ষণিক রসিদ নিশ্চিত করা হয়, যাতে অর্থ সংক্রান্ত কোনো বিভ্রান্তি না থাকে।",
  },
};

export function WhyUsItem({ title, description, icon }: WhyUsItemProps) {
  const { isBn } = useLanguage();

  let displayTitle = title;
  let displayDesc = description;

  if (isBn) {
    const titleLower = title.toLowerCase();
    const matchedKey = Object.keys(BENGALI_WHY_US).find((k) => titleLower.includes(k));
    if (matchedKey) {
      displayTitle = BENGALI_WHY_US[matchedKey].title;
      displayDesc = BENGALI_WHY_US[matchedKey].description;
    }
  }

  return (
    <div className="glass glass-sweep flex h-full flex-col gap-1.5 sm:gap-3 rounded-2xl sm:rounded-3xl p-3 sm:p-5">
      <span className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-gold/15 text-gold shrink-0">
        <Icon name={icon} className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <h3 className="font-display text-xs sm:text-base font-semibold text-ink line-clamp-2">
        {displayTitle}
      </h3>
      <p className="text-[11px] sm:text-sm leading-relaxed text-ink-soft line-clamp-3 sm:line-clamp-none">
        {displayDesc}
      </p>
    </div>
  );
}
