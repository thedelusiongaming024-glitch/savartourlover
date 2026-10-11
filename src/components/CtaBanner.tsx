"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/context/LanguageContext";

interface CtaBannerProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export function CtaBanner(props: CtaBannerProps) {
  const { isBn } = useLanguage();

  const eyebrow =
    props.eyebrow ??
    (isBn ? "সাভার ট্যুর লাভার — আপনার স্বপ্ন উড়তে দিন" : "Savar Tour Lover — Let Your Dreams Fly");
  const title =
    props.title ??
    (isBn
      ? "বাংলাদেশ ভ্রমণের পরিকল্পনা শুরু করুন"
      : "Plan your next journey across Bangladesh");
  const description =
    props.description ??
    (isBn
      ? "কোথায় এবং কখন যেতে চান তা জানান — আমরা আপনার পছন্দমতো ভ্রমণ সাজিয়ে দেব। অল্প অগ্রিম দিয়ে বুকিং করুন এবং বাকি টাকা ট্যুরের দিন দিন।"
      : "Tell us where you want to go and when — we'll design a tour around you. Book with a small advance and settle the rest on tour day.");
  const ctaLabel =
    props.ctaLabel ?? (isBn ? "ভ্রমণ পরিকল্পনা" : "Plan My Trip");
  const ctaHref = props.ctaHref ?? "/contact";
  const secondaryCtaLabel =
    props.secondaryCtaLabel ?? (isBn ? "ট্যুরগুলো দেখুন" : "Browse Tours");
  const secondaryCtaHref = props.secondaryCtaHref ?? "/tours";
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald via-emerald to-emerald-deep p-8 text-center sm:p-16">
          <Atmosphere intensity={0.22} />
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
              {eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-50/90">
              {description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Link href={ctaHref} className="btn btn-gold">
                  {ctaLabel}
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href={secondaryCtaHref}
                  className="btn border border-white/30 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  {secondaryCtaLabel}
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
