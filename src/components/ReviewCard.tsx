"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Icon } from "@/components/Icon";
import { normalizeImageUrl } from "@/lib/media";
import type { Review } from "@/lib/types";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = normalizeImageUrl(review.photoUrl);

  return (
    <GlassCard
      as="figure"
      lift={6}
      className="glass glass-sweep flex h-full flex-col rounded-3xl p-6 shadow-glass transition-shadow duration-300 hover:shadow-glass-lg"
    >
      <div className="flex items-center gap-1 text-gold" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 18 }}
          >
            <Icon
              name="star"
              className={`h-4 w-4 ${i < review.rating ? "" : "opacity-30"}`}
            />
          </motion.span>
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-soft">
        &ldquo;{review.text}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/60 pt-4">
        {photo && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={review.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-emerald-deep font-display text-sm font-semibold text-white">
            {review.name.charAt(0)}
          </span>
        )}
        <div>
          <div className="text-sm font-semibold text-ink">{review.name}</div>
          <div className="text-xs text-ink-faint">
            {review.location} · {review.tour}
          </div>
        </div>
      </figcaption>
    </GlassCard>
  );
}
