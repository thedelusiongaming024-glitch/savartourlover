"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/context/LanguageContext";

export function DestinationPromptBox() {
  const { isBn } = useLanguage();

  return (
    <Reveal className="mt-14">
      <div className="glass glass-sweep flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            {isBn ? "পছন্দের গন্তব্য বেছে নিতে পারছেন না?" : "Can't decide?"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {isBn
              ? "আপনার কাঙ্ক্ষিত তারিখ, ভ্রমণকারীর সংখ্যা এবং আগ্রহ আমাদের জানান — আমরা সবচেয়ে উপযুক্ত গন্তব্য সুপারিশ করব।"
              : "Tell us your dates, group size, and what you love — we'll recommend the perfect destination."}
          </p>
        </div>
        <Link href="/contact" className="btn btn-emerald shrink-0">
          {isBn ? "ভ্রমণ পরিকল্পনা" : "Plan My Trip"}
        </Link>
      </div>
    </Reveal>
  );
}
