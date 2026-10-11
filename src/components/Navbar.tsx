"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const reduce = useSafeReducedMotion();
  const { t, isBn } = useLanguage();

  const navLinks = [
    { href: "/destinations", label: t("nav.destinations") },
    { href: "/tours", label: t("nav.tours") },
    { href: "/about", label: t("nav.about") },
    { href: "/journal", label: t("nav.journal") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (pathname?.startsWith("/staff")) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`glass-sweep glass mx-auto flex max-w-6xl items-center justify-between rounded-full py-2.5 pl-3.5 pr-2.5 sm:py-3 sm:pl-6 sm:pr-3 transition-shadow duration-300 ${
          scrolled ? "shadow-glass-lg" : "shadow-glass"
        }`}
      >
        <Link href="/" className="group relative flex items-center shrink-0 -my-1 sm:-my-1.5">
          {/* Luminous emerald-teal gradient aura */}
          <div
            className="absolute -inset-x-3 -inset-y-1.5 rounded-full bg-gradient-to-r from-emerald-400/20 via-teal-300/25 to-emerald-500/20 blur-lg opacity-60 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
            aria-hidden="true"
          />
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="relative shrink-0 flex items-center justify-center py-0.5"
          >
            <img
              src="/images/logo-horizontal.png"
              alt="Savar Tour Lover"
              className="h-12 xs:h-[50px] sm:h-[58px] md:h-[60px] lg:h-[65px] w-auto object-contain transition-all duration-300 select-none"
            />
          </motion.div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-emerald-deep"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 rounded-full bg-white/70"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Profile / My Bookings */}
          <Link
            href="/profile"
            aria-label="My Bookings & Profile"
            className={`flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center sm:px-3 sm:py-1.5 rounded-full border border-ink/10 bg-white/70 text-ink-soft transition-all hover:bg-white hover:text-emerald-deep ${
              pathname.startsWith("/profile") ? "border-emerald-deep/40 text-emerald-deep bg-white shadow-xs" : ""
            }`}
          >
            <svg className="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden lg:inline ml-1.5 text-xs font-semibold">{isBn ? "বুকিং" : "Bookings"}</span>
          </Link>

          {/* Always visible Language toggle on all screen sizes */}
          <LanguageToggle className="inline-flex scale-90 sm:scale-100" />

          {/* Plan My Trip desktop/tablet CTA */}
          <motion.div whileTap={{ scale: 0.96 }} className="hidden md:inline-flex">
            <Link href="/contact" className="btn btn-emerald !px-5 !py-2.5 text-sm">
              {t("nav.planTrip")}
            </Link>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink transition-colors hover:bg-white md:hidden"
          >
            <div className="relative h-3.5 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                  open ? "top-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                  open ? "top-1.5 -rotate-45" : ""
                }`}
              />
            </div>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="glass-strong mt-2.5 overflow-y-auto max-h-[calc(100dvh-5.5rem)] rounded-3xl shadow-glass-lg border border-white/60 md:hidden"
          >
            <motion.nav
              className="flex flex-col p-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 mb-1 border-b border-white/40">
                <span className="text-xs font-semibold text-ink-faint uppercase tracking-wider">Language / ভাষা</span>
                <LanguageToggle />
              </div>
              {[{ href: "/", label: t("nav.home") }, ...navLinks, { href: "/contact", label: t("nav.contact") }].map(
                (link) => {
                  const active = pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      variants={{
                        hidden: { opacity: 0, x: reduce ? 0 : -12 },
                        show: { opacity: 1, x: 0 },
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`block rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                          active
                            ? "bg-emerald/10 text-emerald-deep font-semibold"
                            : "text-ink-soft hover:bg-white/70 hover:text-ink"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                }
              )}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: reduce ? 0 : -12 },
                  show: { opacity: 1, x: 0 },
                }}
              >
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                    pathname.startsWith("/profile")
                      ? "bg-emerald/10 text-emerald-deep font-semibold"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{isBn ? "বুকিং ও প্রোফাইল" : "My Bookings & Profile"}</span>
                </Link>
              </motion.div>
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: reduce ? 0 : -12 },
                  show: { opacity: 1, x: 0 },
                }}
              >
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="btn btn-emerald mt-2.5 w-full !py-3.5 text-center justify-center flex"
                >
                  {t("nav.planTrip")}
                </Link>
              </motion.div>

              <div className="mt-3 pt-3 border-t border-white/40 px-3 text-xs text-ink-soft space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <span>📞</span>
                  <a href="tel:01620592884" className="hover:underline">01620592884</a>
                  <span>•</span>
                  <a href="tel:01646325350" className="hover:underline">01646325350</a>
                </div>
                <p className="text-[11px] text-ink-faint">
                  📍 Savar Pollibidut, Kobarsthan Road, Savar, Dhaka
                </p>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
