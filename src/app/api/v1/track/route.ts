import { NextResponse } from "next/server";
import {
  extractRequestTrackingData,
  trackServerEvent,
  getAnalyticsStats,
  getRecentAnalyticsEvents,
} from "@/server/tracking";

/**
 * Endpoint for client-side beacon/fetch server-side tracking.
 * Receives page_views, tour_views, search, and interactions from the browser
 * and records them on the server without relying on 3rd party tracker scripts.
 */
export async function POST(request: Request) {
  try {
    const { ip, ip_hash, user_agent, referrer: reqReferrer } = extractRequestTrackingData(request);

    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else if (contentType.includes("text/plain")) {
      try {
        const text = await request.text();
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const eventName = body.event_name || "page_view";
    const path = body.path || "/";
    const title = body.title || "";
    const referrer = body.referrer || reqReferrer || "";
    const sessionId = body.session_id || "";
    const visitorId = body.visitor_id || "";
    const utmSource = body.utm_source || undefined;
    const utmMedium = body.utm_medium || undefined;
    const utmCampaign = body.utm_campaign || undefined;
    const utmTerm = body.utm_term || undefined;
    const utmContent = body.utm_content || undefined;
    const metadata = body.metadata || {};

    const recorded = await trackServerEvent({
      event_name: eventName,
      path,
      title,
      referrer,
      user_agent,
      ip,
      ip_hash,
      session_id: sessionId,
      visitor_id: visitorId,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      metadata,
    });

    return NextResponse.json({ success: true, event_id: recorded.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tracking failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/**
 * GET: Returns server-side analytics summary and stats.
 */
export async function GET() {
  try {
    const stats = getAnalyticsStats();
    const recent = getRecentAnalyticsEvents(30);

    return NextResponse.json({
      success: true,
      stats,
      recent,
      server_time: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
