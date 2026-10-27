import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden px-4 py-32 sm:px-6">
      <Atmosphere intensity={0.28} />
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="glass flex h-16 w-16 items-center justify-center rounded-full text-emerald-deep">
          <Icon name="mapPin" className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          This trail doesn&apos;t exist
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          The page you&apos;re looking for may have moved or never existed.
          Let&apos;s get you back to exploring Bangladesh.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-emerald">
            Back to home
          </Link>
          <Link href="/tours" className="btn btn-glass">
            Browse tours
          </Link>
        </div>
      </div>
    </section>
  );
}
