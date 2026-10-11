"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * A hydration-safe wrapper around framer-motion's useReducedMotion().
 *
 * useReducedMotion() returns `null` during server rendering (there's no
 * window.matchMedia on the server) and then resolves to the real OS
 * preference on the client, essentially immediately. Any animation prop
 * branched directly on that raw value — e.g. `y: reduce ? 0 : 24` — ends up
 * server-rendering the "not reduced" variant while a client whose OS has
 * "prefers-reduced-motion" enabled renders the "reduced" variant on its very
 * first paint. React (and Next's hydration diffing) sees this as a real
 * mismatch, because it is one: the two renders produce genuinely different
 * style values, not just different string/number formatting of the same
 * value.
 *
 * This hook always returns `false` for the first render (matching what SSR
 * produced), then swaps in the real preference once mounted. Any change
 * from that happens as an ordinary post-hydration re-render/animation, not
 * a server/client mismatch.
 */
export function useSafeReducedMotion(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Intentional mount-detection, not derived state: this is the documented
  // SSR/client hydration-match pattern above, not the "you might not need
  // an effect" anti-pattern react-hooks/set-state-in-effect targets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return mounted ? !!reduce : false;
}
