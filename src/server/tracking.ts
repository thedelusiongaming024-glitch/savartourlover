import crypto from "node:crypto";
import { recordAnalyticsEvent, getAnalyticsStats, getRecentAnalyticsEvents } from "./db";
import type { DbAnalyticsEvent } from "./types";

/**
 * Server-Side Tracking & Analytics Engine
 * Provides privacy-respecting, first-party event tracking directly from the Next.js server.
 * Can forward server-side conversions to GA4 Measurement Protocol or Meta Conversions API (CAPI)
 * when API keys are configured.
 */

export interface TrackServerEventParams {
  event_name: DbAnalyticsEvent["event_name"];
  path?: string;
  title?: string;
  referrer?: string;
  user_agent?: string;
  ip?: string;
  ip_hash?: string;
  session_id?: string;
  visitor_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Anonymize client IP using a date-salted SHA-256 hash.
 * This guarantees privacy compliance (GDPR/ePrivacy) while preserving unique daily visitor counting.
 */
export function hashIp(ip?: string, userAgent?: string): string {
  if (!ip && !userAgent) return "anonymous";
  const dateKey = new Date().toISOString().slice(0, 10);
  const salt = process.env.TRACKING_SALT || (process.env.NODE_ENV === "production" ? "stl-prod-" + (process.env.VERCEL_URL || "default") : "savar-tour-lover-dev-salt");
  return crypto
    .createHash("sha256")
    .update(`${ip || ""}|${userAgent || ""}|${dateKey}|${salt}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Extracts client metadata from an incoming HTTP Request.
 */
export function extractRequestTrackingData(request: Request): {
  ip: string;
  ip_hash: string;
  user_agent: string;
  referrer: string;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = (forwardedFor ? forwardedFor.split(",")[0].trim() : realIp) || "";
  const user_agent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";
  const ip_hash = hashIp(ip, user_agent);

  return { ip, ip_hash, user_agent, referrer };
}

/**
 * Optional: Forward event to Google Analytics 4 Measurement Protocol
 * Runs purely server-to-server, completely bypassing browser ad-blockers.
 */
async function dispatchToGa4(event: DbAnalyticsEvent, clientId: string): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return;

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const payload = {
      client_id: clientId || "stl-anonymous-client",
      events: [
        {
          name: event.event_name,
          params: {
            page_location: event.path ? `https://savartourlover.com${event.path}` : undefined,
            page_title: event.title,
            page_referrer: event.referrer,
            session_id: event.session_id,
            utm_source: event.utm_source,
            utm_medium: event.utm_medium,
            utm_campaign: event.utm_campaign,
            ...(event.metadata || {}),
          },
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[Tracking] GA4 Measurement Protocol dispatch failed:", err);
  }
}

/**
 * Optional: Forward event to Meta Conversions API (CAPI)
 */
async function dispatchToMetaCapi(event: DbAnalyticsEvent): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return;

  try {
    const metaEventName =
      event.event_name === "booking_created"
        ? "Purchase"
        : event.event_name === "initiate_checkout"
        ? "InitiateCheckout"
        : event.event_name === "contact_inquiry"
        ? "Lead"
        : event.event_name === "tour_view"
        ? "ViewContent"
        : "PageView";

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    const payload = {
      data: [
        {
          event_name: metaEventName,
          event_time: Math.floor(new Date(event.created_at).getTime() / 1000),
          event_source_url: event.path ? `https://savartourlover.com${event.path}` : "https://savartourlover.com",
          action_source: "website",
          user_data: {
            client_user_agent: event.user_agent,
          },
          custom_data: event.metadata || {},
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[Tracking] Meta CAPI dispatch failed:", err);
  }
}

/**
 * Main tracking function: records server-side event to local/cloud database
 * and forwards to configured server tracking endpoints.
 * Never throws errors to caller.
 */
export async function trackServerEvent(params: TrackServerEventParams): Promise<DbAnalyticsEvent> {
  try {
    const ip_hash = params.ip_hash || hashIp(params.ip, params.user_agent);

    const event = recordAnalyticsEvent({
      event_name: params.event_name,
      path: params.path,
      title: params.title,
      referrer: params.referrer,
      user_agent: params.user_agent,
      ip_hash,
      session_id: params.session_id,
      visitor_id: params.visitor_id || ip_hash,
      utm_source: params.utm_source,
      utm_medium: params.utm_medium,
      utm_campaign: params.utm_campaign,
      utm_term: params.utm_term,
      utm_content: params.utm_content,
      metadata: params.metadata,
    });

    // Non-blocking external forwards
    void dispatchToGa4(event, params.session_id || ip_hash);
    void dispatchToMetaCapi(event);

    return event;
  } catch (err) {
    console.error("[Tracking] Failed to record server tracking event:", err);
    // Return dummy event on failure so caller doesn't break
    return {
      id: "err",
      event_name: params.event_name,
      created_at: new Date().toISOString(),
    };
  }
}

export { getAnalyticsStats, getRecentAnalyticsEvents };
