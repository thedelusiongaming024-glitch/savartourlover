"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Icon } from "@/components/Icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client-side so the failure is visible in dev tools even though
    // there's no backend telemetry wired up yet.
    console.error(error);
  }, [error]);

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden px-4 py-32 sm:px-6">
      <Atmosphere intensity={0.28} />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="glass flex h-16 w-16 items-center justify-center rounded-full text-coral">
          <Icon name="shield" className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Something went off course
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          An unexpected error interrupted this page. It&apos;s on us — try
          again, or head back and pick up where you left off.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="btn btn-emerald">
            Try again
          </button>
          <Link href="/" className="btn btn-glass">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
