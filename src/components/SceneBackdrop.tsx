"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import { getScene } from "@/lib/scenes";
import { normalizeImageUrl, normalizeVideoUrl } from "@/lib/media";
import type { Scene } from "@/lib/types";

interface SceneProps {
  scene: Scene;
  className?: string;
  showLabel?: boolean;
}

/**
 * Renders a destination/tour's real uploaded photo or video when one
 * exists (scene.imageUrl / scene.videoUrl), with the gradient "atmosphere
 * scene" as both a loading-state base layer and the fallback for anything
 * that hasn't had a photo uploaded yet — so the site never regresses to a
 * broken image icon, it just quietly shows the gradient it always showed
 * before real media existed. Supports standard URLs, Google Drive links, and videos.
 */
export function SceneBackdrop({ scene, className, showLabel = true }: SceneProps) {
  const def = getScene(scene.key);
  const reduce = useSafeReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const normalizedImage = normalizeImageUrl(scene.imageUrl);
  const videoSource = normalizeVideoUrl(scene.videoUrl);

  const showVideo = Boolean(videoSource.url) && !videoFailed;
  const showImage = !showVideo && Boolean(normalizedImage) && !imageFailed;

  return (
    <motion.div
      className={`relative flex items-end justify-center overflow-hidden ${className ?? ""}`}
      style={{ background: def.background }}
      role="img"
      aria-label={scene.label}
      initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {showVideo && (
        videoSource.isIframe ? (
          <iframe
            className="absolute inset-0 h-full w-full object-cover pointer-events-none border-0 scale-125"
            src={videoSource.url}
            allow="autoplay; encrypted-media"
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={videoSource.url}
            autoPlay
            muted
            loop
            playsInline
            poster={normalizedImage}
            onError={() => setVideoFailed(true)}
          />
        )
      )}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={normalizedImage}
          alt={scene.label}
          onError={() => setImageFailed(true)}
        />
      )}
      {/* Soft light rays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(120% 90% at 85% 10%, rgba(255,255,255,0.55) 0%, transparent 55%), radial-gradient(90% 80% at 10% 90%, rgba(255,255,255,0.28) 0%, transparent 50%)",
        }}
      />
      {/* Rim glow for a lit edge */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -40px 80px rgba(0,0,0,0.22)`,
        }}
      />
      {/* Horizon band */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.20))`,
        }}
      />
      {showLabel && (
        <div className="absolute inset-x-0 bottom-0 p-5">
          <span
            className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{
              background: "rgba(255,255,255,0.28)",
              border: "1px solid rgba(255,255,255,0.45)",
              color: "#ffffff",
              backdropFilter: "blur(8px)",
            }}
          >
            {def.motif ?? scene.label}
          </span>
        </div>
      )}
    </motion.div>
  );
}
