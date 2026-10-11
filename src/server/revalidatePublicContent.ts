import { revalidatePath } from "next/cache";

/**
 * Public pages (/, /tours, /destinations, /journal, /about and their detail
 * pages) are served with ISR (`export const revalidate = <seconds>`) instead
 * of `force-dynamic` so that, under real traffic, Vercel/Next serves cached
 * HTML instead of re-running the page function — and therefore re-querying
 * Supabase — on every single request. That's essential to stay inside
 * Supabase's free-tier egress cap (5 GB/month) and Vercel's free-tier
 * function-invocation allowance once there's meaningful traffic.
 *
 * The trade-off is that an admin edit is no longer reflected instantly —
 * it would only show up once the cached copy's TTL expires. Call this from
 * every admin write route that changes catalog/CMS content so the relevant
 * pages are invalidated immediately instead of waiting out the TTL.
 */
export function revalidatePublicContent(extraPaths: string[] = []): void {
  const paths = new Set<string>(["/", "/tours", "/destinations", "/journal", "/about", ...extraPaths]);
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      // Never let a cache-invalidation failure fail the admin write itself —
      // worst case the page just serves stale content until its TTL expires.
      console.warn(`[cache] revalidatePath(${path}) failed:`, err);
    }
  }
}
