"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function randomId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getOrSetSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem("stl_sid");
    if (!sid) {
      sid = randomId("sid");
      sessionStorage.setItem("stl_sid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

function getOrSetVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let vid = localStorage.getItem("stl_vid");
    if (!vid) {
      vid = randomId("vid");
      localStorage.setItem("stl_vid", vid);
    }
    return vid;
  } catch {
    return "";
  }
}

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

function getStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("stl_utm");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updateUtmFromUrl(searchParams: URLSearchParams): UtmParams {
  if (typeof window === "undefined") return {};
  const current = getStoredUtm();
  const keys: (keyof UtmParams)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  let hasNew = false;
  const updated: UtmParams = { ...current };

  for (const k of keys) {
    const val = searchParams.get(k);
    if (val) {
      updated[k] = val;
      hasNew = true;
    }
  }

  if (hasNew) {
    try {
      sessionStorage.setItem("stl_utm", JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

function sendServerBeacon(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const url = "/api/v1/track";
  const json = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([json], { type: "application/json" });
    const success = navigator.sendBeacon(url, blob);
    if (success) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
  }).catch(() => {});
}

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // Avoid double firing for the identical location on initial hydrate
    const fullPath = searchParams && searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (lastTracked.current === fullPath) return;
    lastTracked.current = fullPath;

    const utm = updateUtmFromUrl(searchParams || new URLSearchParams());
    const sessionId = getOrSetSessionId();
    const visitorId = getOrSetVisitorId();

    // Delay slightly to let document.title update after client transition
    const timeout = setTimeout(() => {
      sendServerBeacon({
        event_name: "page_view",
        path: fullPath,
        title: typeof document !== "undefined" ? document.title : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        session_id: sessionId,
        visitor_id: visitorId,
        ...utm,
      });
    }, 120);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null;
}

export function ServerTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
