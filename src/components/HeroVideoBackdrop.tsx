"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeVideoUrl } from "@/lib/media";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import type { HeroSlideItem } from "@/server/types";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface HeroVideoBackdropProps {
  videoUrl?: string | null;
  fallbackSlides?: HeroSlideItem[];
}

export function HeroVideoBackdrop({ videoUrl, fallbackSlides }: HeroVideoBackdropProps) {
  const [hasError, setHasError] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = normalizeVideoUrl(videoUrl);
  const youtubeId = normalized.youtubeId;

  // Initialize YouTube IFrame Player API for reliable autoplay, muting, and loop with NO pause controls
  useEffect(() => {
    if (!youtubeId || hasError) return;
    let isMounted = true;

    function initYT() {
      if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) return;
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: youtubeId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
          },
          events: {
            onReady: (e: any) => {
              try {
                e.target.mute();
                e.target.playVideo();
                setApiLoaded(true);
              } catch {}
            },
            onStateChange: (e: any) => {
              // 0 = ENDED: seamlessly replay from start
              if (e.data === 0) {
                try {
                  e.target.seekTo(0);
                  e.target.playVideo();
                } catch {}
              }
              // 2 = PAUSED: immediately resume playing so it never stays paused
              if (e.data === 2) {
                try {
                  e.target.playVideo();
                } catch {}
              }
            },
            onError: () => {
              // If YouTube blocks embed, fallback gracefully
              setHasError(true);
            },
          },
        });
      } catch {
        setHasError(true);
      }
    }

    if (!window.YT) {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName("script")[0];
        firstScript?.parentNode?.insertBefore(tag, firstScript);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initYT();
      };
    } else if (window.YT.Player) {
      initYT();
    }

    return () => {
      isMounted = false;
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, [youtubeId, hasError]);

  if (!videoUrl || !videoUrl.trim() || hasError) {
    return <HeroSlideshow slides={fallbackSlides} />;
  }

  if (!normalized.url) {
    return <HeroSlideshow slides={fallbackSlides} />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      {/* Video layer: auto-resize and fit container without distortion or letterboxing */}
      {youtubeId ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* YouTube Player target element */}
          <div
            ref={containerRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none scale-125"
            style={{
              width: "177.78vh",
              minWidth: "100%",
              height: "56.25vw",
              minHeight: "100%",
              pointerEvents: "none",
            }}
          />
          {/* Fallback direct iframe while API initializes */}
          {!apiLoaded && (
            <iframe
              src={normalized.url}
              title="Hero Background Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none scale-125"
              style={{
                width: "177.78vh",
                minWidth: "100%",
                height: "56.25vw",
                minHeight: "100%",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      ) : normalized.isIframe ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <iframe
            src={normalized.url}
            title="Hero Background Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none scale-125"
            style={{
              width: "177.78vh",
              minWidth: "100%",
              height: "56.25vw",
              minHeight: "100%",
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
        <video
          src={normalized.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setHasError(true)}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        >
          <source src={normalized.url} />
          Your browser does not support HTML5 video.
        </video>
      )}

      {/* Transparent interaction shield: absorbs all clicks/taps/hovers so video cannot be paused or played */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[4] cursor-default select-none pointer-events-auto"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Pearl halo behind the headline so text stays crisp and legible while video stays vivid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background:
            "radial-gradient(75% 65% at 50% 35%, rgba(247,250,249,0.68) 0%, rgba(247,250,249,0.35) 42%, rgba(247,250,249,0.08) 70%, rgba(247,250,249,0) 90%)",
        }}
      />

      {/* Fade to page background at the bottom edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 pointer-events-none z-[2]"
        style={{
          background:
            "linear-gradient(to top, var(--color-pearl) 0%, rgba(247,250,249,0.6) 40%, transparent 100%)",
        }}
      />

      {/* Soft wash at the very top for navbar contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-20 pointer-events-none z-[2]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,250,249,0.5) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
