"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  once?: boolean;
  /** Frost-in: content resolves out of a soft blur, like glass clearing */
  blur?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
  once = true,
  blur = true,
}: RevealProps) {
  const reduce = useSafeReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: reduce ? 0 : y,
        filter: reduce || !blur ? "blur(0px)" : "blur(6px)",
      }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
