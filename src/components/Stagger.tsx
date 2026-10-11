"use client";

import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import type { ReactNode } from "react";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

export function Stagger({ children, className, stagger = 0.1 }: StaggerProps) {
  const reduce = useSafeReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: reduce ? 0 : stagger },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  y?: number;
  /** Frost-in: item resolves out of a soft blur, like glass clearing */
  blur?: boolean;
}

export function StaggerItem({
  children,
  className,
  y = 28,
  blur = true,
}: StaggerItemProps) {
  const reduce = useSafeReducedMotion();
  const applyBlur = blur && !reduce;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: {
          opacity: 0,
          y: reduce ? 0 : y,
          filter: applyBlur ? "blur(8px)" : "blur(0px)",
        },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
