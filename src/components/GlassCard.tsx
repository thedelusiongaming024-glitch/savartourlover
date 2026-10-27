"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import type { MouseEvent, ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Use <figure> instead of <div> for the outer element */
  as?: "div" | "figure";
  /** Disable the cursor-tracked tilt (keeps the sheen + frame) */
  tilt?: boolean;
  /** How far the card lifts on hover */
  lift?: number;
}

/**
 * The site's signature surface: a frosted panel that behaves like real
 * glass. It tilts gently toward the cursor, catches a specular sheen
 * that follows the pointer, and wakes a slow gilt shimmer ring on the
 * frame — all dormant until the visitor interacts, so the page stays
 * calm at rest.
 */
export function GlassCard({
  children,
  className = "",
  as = "div",
  tilt = true,
  lift = 8,
}: GlassCardProps) {
  const reduce = useSafeReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const springCfg = { stiffness: 260, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), springCfg);
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), springCfg);
  const glowX = useTransform(px, (v) => `${v * 100}%`);
  const glowY = useTransform(py, (v) => `${v * 100}%`);

  const active = tilt && !reduce;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  const MotionTag = as === "figure" ? motion.figure : motion.div;

  return (
    <MotionTag
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -lift }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      style={{
        rotateX: active ? rotateX : 0,
        rotateY: active ? rotateY : 0,
        transformPerspective: 1000,
        // CSS custom properties consumed by .glass-spotlight in globals.css
        ["--glow-x" as string]: glowX,
        ["--glow-y" as string]: glowY,
      }}
      className={`glass-card-premium ${className}`}
    >
      <span className="glass-spotlight" aria-hidden="true" />
      {children}
    </MotionTag>
  );
}
