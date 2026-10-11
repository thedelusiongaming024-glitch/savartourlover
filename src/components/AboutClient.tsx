"use client";

import { useState } from "react";
import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { SectionHeading } from "@/components/SectionHeading";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { CtaBanner } from "@/components/CtaBanner";
import { Icon } from "@/components/Icon";
import { whyUs, siteName, siteNameBn } from "@/data/site";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeImageUrl } from "@/lib/media";
import type { AboutPageCmsContent, AboutValueItem, AboutTeamMember } from "@/server/types";

interface AboutClientProps {
  cms: AboutPageCmsContent;
  defaultValues: AboutValueItem[];
  defaultTeam: AboutTeamMember[];
  defaultParagraphs: string[];
}

const BENGALI_VALUES_MAP: Record<string, { title: string; description: string }> = {
  "Radical transparency": {
    title: "শতভাগ স্বচ্ছতা",
    description: "কোনো গোপন রিসোর্ট চার্জ, বাড়তি জ্বালানি ফি বা বাধ্যতামূলক বকশিশ নেই। প্রতিটি টাকার হিসাব আগে থেকেই নিশ্চিত।",
  },
  "Local, always": {
    title: "সর্বদা স্থানীয় গাইড",
    description: "কোনো তৃতীয় পক্ষ বা বাইরের গাইড নয়। আমাদের প্রতিটি হোস্ট স্থানীয় বাংলাদেশি এবং প্রতিটি রুট বাস্তব অভিজ্ঞতায় তৈরি।",
  },
  "Hospitality first": {
    title: "আতিথেয়তা সবার আগে",
    description: "সাভার ট্যুর লাভার-এ ভ্রমণকারীদের আতিথেয়তা সবার আগে। বুকিং নম্বরের মতো নয়, আমরা আপনাকে পরিবারের মানুষের মতোই আপন করে নিই।",
  },
  "Considered detail": {
    title: "সূক্ষ্ম বিষয়ের যত্ন",
    description: "পাহাড়ে শুধু স্থানীয়দের জানা হাঁটার পথ থেকে শুরু করে রাতের শান্ত ক্যান্ডেললাইট ডিনার — প্রতিটি ছোট বিষয়ই সুন্দর ভ্রমণের চাবিকাঠি।",
  },
};

const BENGALI_TEAM_ROLES: Record<string, string> = {
  "Co-founder & Head of Experience": "সহ-প্রতিষ্ঠাতা ও অভিজ্ঞতা প্রধান",
  "Co-founder & Head of Operations": "সহ-প্রতিষ্ঠাতা ও অপারেশনস প্রধান",
  "Head of Finance": "অর্থ ও হিসাব প্রধান",
  "Lead Guide": "প্রধান ট্রাভেল গাইড",
  "Local Guide": "স্থানীয় হোস্ট ও গাইড",
};

const BENGALI_WHY_US_MAP: Record<string, { title: string; description: string }> = {
  "Trusted local hosts": {
    title: "বিশ্বস্ত স্থানীয় হোস্ট",
    description: "প্রতিটি ট্যুর পরিচালনা করেন স্থানীয় অভিজ্ঞ হোস্ট, যিনি নিজের পরিবারের মতো দায়িত্বে পথ দেখান।",
  },
  "Transparent pricing": {
    title: "শতভাগ স্বচ্ছ মূল্যতালিকা",
    description: "যা দেখছেন ঠিক তাই পরিশোধ করবেন। কোনো লুকানো চার্জ, অতিরিক্ত জ্বালানি ফি বা শেষ মুহূর্তের চমক নেই।",
  },
  "Flexible payment": {
    title: "নমনীয় পেমেন্ট সুবিধা",
    description: "বুকিংয়ের সময় ৪০% অগ্রিম দিন এবং বাকি অর্থ ট্যুরের দিন কিউআর স্ক্যানে বা অনলাইনে পরিশোধ করুন।",
  },
  "Zero-friction booking": {
    title: "সহজ ও দ্রুত বুকিং",
    description: "কয়েক মিনিটেই বুকিং থেকে ই-টিকিট। আপনার ভাউচার, কিউআর টিকিট ও রিমাইন্ডার পৌঁছে যাবে হোয়াটসঅ্যাপ ও ইমেইলে।",
  },
  "Real 24/7 support": {
    title: "২৪/৭ সার্বক্ষণিক মানবিক সহায়তা",
    description: "কোনো রোবট বা চ্যাটবট নয় — পুরো ভ্রমণ জুড়ে আমাদের ডেডিকেটেড টিম হোয়াটসঅ্যাপে তাৎক্ষণিক সহায়তা প্রদান করে।",
  },
  "Money, fully accounted": {
    title: "অর্থের পরিপূর্ণ নিরাপত্তা",
    description: "প্রতিটি লেনদেন স্বচ্ছভাবে সংরক্ষিত ও নিশ্চিত করা হয়, যাতে কোনো প্রকার আর্থিক বিভ্রান্তির অবকাশ না থাকে।",
  },
};

function TeamMemberCard({ member }: { member: AboutTeamMember }) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalized = normalizeImageUrl(member.image_url);
  const showImage = Boolean(normalized) && !imageFailed;

  return (
    <div className="glass glass-sweep h-full overflow-hidden rounded-3xl flex flex-col">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalized}
          alt={member.name}
          className="aspect-[4/3] w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <SceneBackdrop
          scene={{ key: (member.scene as any) || "sajek", label: member.name }}
          className="aspect-[4/3] w-full"
          showLabel={false}
        />
      )}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-display text-base font-semibold text-ink">
          {member.name}
        </h3>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-emerald">
          {member.role}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {member.bio}
        </p>
      </div>
    </div>
  );
}

export function AboutClient({
  cms,
  defaultValues,
  defaultTeam,
  defaultParagraphs,
}: AboutClientProps) {
  const { isBn, t } = useLanguage();

  const rawValues = cms.values && cms.values.length > 0 ? cms.values : defaultValues;
  const rawTeam = cms.team && cms.team.length > 0 ? cms.team : defaultTeam;
  const rawParagraphs =
    cms.story_paragraphs && cms.story_paragraphs.length > 0
      ? cms.story_paragraphs
      : defaultParagraphs;

  // Helper to check if string contains Bengali characters
  const hasBengali = (str?: string) => Boolean(str && /[\u0980-\u09FF]/.test(str));

  // Localized hero copy: prioritize admin CMS if it contains Bengali, otherwise use translation dictionary
  const heroEyebrow = isBn
    ? (hasBengali(cms.hero_eyebrow) ? cms.hero_eyebrow : t("about.heroEyebrow", "আমাদের পরিচিতি"))
    : cms.hero_eyebrow || "Our story";

  const heroTitle = isBn
    ? (hasBengali(cms.hero_title) ? cms.hero_title : t("about.title", "বাংলাদেশকে ভালোবেসে স্থানীয়দের হাতে গড়া"))
    : cms.hero_title || "Built by people who call Bangladesh home";

  const heroSubtitle = isBn
    ? (hasBengali(cms.hero_subtitle)
        ? cms.hero_subtitle
        : t("about.subtitle", `${siteNameBn} শুরু হয়েছিল এক সহজ প্রত্যয় থেকে: দেশে ভ্রমণ করার অর্থ অযথা মধ্যস্থতাকারী, অস্পষ্ট মূল্যতালিকা বা প্রমাণহীন লেনদেন নয়।`))
    : cms.hero_subtitle ||
      `${siteName} (${siteNameBn}) started with a simple frustration: booking a domestic trip meant middlemen, vague pricing, and cash changing hands with no record.`;

  // Localized story copy
  const storyBadge = isBn
    ? (hasBengali(cms.story_badge) ? cms.story_badge : t("about.storyBadge", "কোথা থেকে শুরু"))
    : cms.story_badge || "Where it started";
  const storyTitle = isBn
    ? (hasBengali(cms.story_title) ? cms.story_title : t("about.storyTitle", "একটি সাধারণ অসন্তোষ থেকে এক নির্ভরযোগ্য এজেন্সি"))
    : cms.story_title || "From a shared frustration to a proper agency";

  const storyParagraphs = isBn
    ? (rawParagraphs.some((p) => hasBengali(p))
        ? rawParagraphs
        : (t("about.storyParagraphs") as unknown as string[]) || rawParagraphs)
    : rawParagraphs;
  const safeParagraphs = Array.isArray(storyParagraphs) ? storyParagraphs : rawParagraphs;

  const missionTitle = isBn
    ? (hasBengali(cms.mission_title) ? cms.mission_title : t("about.ourMission", "আমাদের লক্ষ্য"))
    : cms.mission_title || "Our Mission";
  const missionText = isBn
    ? (hasBengali(cms.mission_text)
        ? cms.mission_text
        : t("about.missionText", "বাংলাদেশের প্রতিটি জেলায় ভ্রমণকারীদের সাথে আন্তরিক ও মর্যাদাশীল স্থানীয় হোস্টদের সংযোগ স্থাপন করা — নিশ্চিত স্বচ্ছতা, সহজ পেমেন্ট এবং সার্বক্ষণিক মানবিক সহায়তায়।"))
    : cms.mission_text ||
      "To make domestic travel across Bangladesh seamless, transparent, and genuinely memorable — while ensuring tourism directly benefits the local communities and guides who make these places special.";

  // Localized values
  const values = rawValues.map((v) => {
    if (!isBn) return v;
    if (hasBengali(v.title)) return v; // Admin typed custom Bangla directly!
    const bnMatch = BENGALI_VALUES_MAP[v.title];
    return {
      ...v,
      title: bnMatch?.title || v.title,
      description: bnMatch?.description || v.description,
    };
  });

  // Localized team
  const team = rawTeam.map((m) => {
    if (!isBn) return m;
    if (hasBengali(m.role)) return m; // Admin typed custom Bangla role!
    const bnRole = BENGALI_TEAM_ROLES[m.role] || m.role;
    return {
      ...m,
      role: bnRole,
    };
  });

  // Payment section copy
  const paymentBadge = isBn
    ? (hasBengali(cms.payment_badge) ? cms.payment_badge : t("about.paymentBadge", "পেমেন্ট ও বুকিং নিশ্চিতকরণ"))
    : cms.payment_badge || "Payment & Booking Confirmation";
  const paymentTitle = isBn
    ? (hasBengali(cms.payment_title) ? cms.payment_title : t("about.paymentTitle", "আপনার অর্থের সুরক্ষা ও স্বচ্ছতা"))
    : cms.payment_title || "How your money is handled, end to end";
  const paymentDescription = isBn
    ? (hasBengali(cms.payment_description)
        ? cms.payment_description
        : t("about.paymentDescription", "বুকিংয়ের সময় বিকাশ, নগদ, রকেট বা কার্ডে পুরো মূল্য বা ছোট একটি অগ্রিম দিন। বাকি অংশ ট্যুরের দিন অনলাইনে বা সরাসরি হোস্টকে দিন। সাথে সাথেই উভয় পক্ষ নিশ্চয়তা পাবেন।"))
    : cms.payment_description ||
      "Pay in full or pay a small advance through bKash, Nagad, Rocket, or card at booking. If you paid partially, the remaining balance is settled on the day of the tour — either online or directly with your local host.";
  const paymentCtaLabel = isBn
    ? (hasBengali(cms.payment_cta_label) ? cms.payment_cta_label : t("about.paymentCta", "কথা বলুন"))
    : cms.payment_cta_label || "Talk to us";

  // CTA banner copy
  const ctaTitle = isBn
    ? (hasBengali(cms.cta_title) ? cms.cta_title : t("about.ctaHeadline", "নতুন চোখে বাংলাদেশকে দেখতে প্রস্তুত?"))
    : cms.cta_title || "Ready to plan your own story?";
  const ctaDescription = isBn
    ? (hasBengali(cms.cta_description)
        ? cms.cta_description
        : t("about.ctaSubheadline", "সাজেকের মেঘের উপত্যকা হোক, সুন্দরবনের রোমাঞ্চ কিংবা সেন্টমার্টিনের নীল জলরাশি — আপনার জন্য চমৎকার রুট প্রস্তুত।"))
    : cms.cta_description ||
      "Tell us where you want to go — we'll take it from there, right through to your final confirmed payment.";
  const ctaLabel = isBn
    ? (hasBengali(cms.cta_label) ? cms.cta_label : t("about.ctaButton", "ভ্রমণ পরিকল্পনা করুন"))
    : cms.cta_label || "Plan My Trip";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-14 pt-32 sm:px-6 sm:pt-40">
        <Atmosphere intensity={0.28} />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-emerald-deep">
              <Icon name="heart" className="h-4 w-4" />
              {heroEyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
              {heroTitle}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {heroSubtitle}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SceneBackdrop
              scene={{ key: "bandarban", label: "Hills of the Chittagong Hill Tracts" }}
              className="aspect-[4/3] w-full rounded-[2rem]"
              showLabel={false}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {storyBadge}
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {storyTitle}
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
              {safeParagraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {missionText && (
              <div className="mt-6 rounded-2xl border border-emerald/20 bg-emerald/5 p-4 sm:p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-deep">
                  {missionTitle}
                </span>
                <p className="mt-1 text-sm leading-relaxed text-ink">
                  {missionText}
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="relative bg-pearl-deep/60 px-4 py-16 sm:px-6 sm:py-24">
        <Atmosphere intensity={0.15} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="What we stand for"
            eyebrowBn="আমাদের মূল্যবোধ"
            title="The values behind every trip"
            titleBn="প্রতিটি ভ্রমণের পেছনের মূল নীতি"
          />
          <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {values.map((value) => (
              <StaggerItem key={value.title} className="h-full">
                <div className="glass glass-sweep flex h-full flex-col gap-3 rounded-3xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
                    <Icon name={value.icon || "shield"} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {value.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {value.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Why us */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={cms.booking_eyebrow || "How booking works"}
            eyebrowBn="বুকিং যেভাবে কাজ করে"
            title={cms.booking_title || "Zero-friction, start to finish"}
            titleBn="সহজ ও ঝামেলামুক্ত অভিজ্ঞতা"
            description={
              cms.booking_description ||
              "From your first search to your final confirmed payment, every step is designed to remove friction and ambiguity."
            }
            descriptionBn="অনুসন্ধান থেকে শুরু করে পেমেন্ট নিশ্চিতকরণ পর্যন্ত — প্রতিটি ধাপ সাজানো হয়েছে সম্পূর্ণ স্বাচ্ছন্দ্যে।"
          />
          <Stagger className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
            {whyUs.map((item) => (
              <StaggerItem key={item.title}>
                <div className="glass glass-sweep flex h-full flex-col gap-3 rounded-3xl p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {isBn ? BENGALI_WHY_US_MAP[item.title]?.title || item.title : item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {isBn ? BENGALI_WHY_US_MAP[item.title]?.description || item.description : item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Team */}
      <section className="relative bg-pearl-deep/60 px-4 py-16 sm:px-6 sm:py-24">
        <Atmosphere intensity={0.15} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={cms.team_eyebrow || "The team"}
            eyebrowBn="আমাদের টিম"
            title={cms.team_title || "A few of the people who'll host you"}
            titleBn="আপনার সেবায় নিবেদিত আমাদের দলের সদস্যগণ"
          />
          <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
            {team.map((member) => (
              <StaggerItem key={member.name} className="h-full">
                <TeamMemberCard member={member} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Payment & confirmation explainer */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald to-emerald-deep p-8 text-white sm:p-14">
              <Atmosphere intensity={0.2} />
              <div className="relative z-10 mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
                  <Icon name="receipt" className="h-4 w-4" />
                  {paymentBadge}
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold sm:text-3xl">
                  {paymentTitle}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-emerald-50/90">
                  {paymentDescription}
                </p>
                <Link href={cms.payment_cta_href || "/contact"} className="btn btn-gold mt-8">
                  {paymentCtaLabel}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner
        title={ctaTitle}
        description={ctaDescription}
        ctaLabel={ctaLabel}
        ctaHref={cms.cta_href || "/contact"}
      />
    </>
  );
}
