import type { Destination } from "@/lib/types";

export const destinations: Destination[] = [];

export function getDestination(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
