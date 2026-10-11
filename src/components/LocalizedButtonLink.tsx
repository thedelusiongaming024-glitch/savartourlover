"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";

interface LocalizedButtonLinkProps {
  href: string;
  labelEn: string;
  labelBn: string;
  className?: string;
  showArrow?: boolean;
}

export function LocalizedButtonLink({
  href,
  labelEn,
  labelBn,
  className = "btn btn-glass shrink-0",
  showArrow = true,
}: LocalizedButtonLinkProps) {
  const { isBn } = useLanguage();
  return (
    <Link href={href} className={className}>
      {isBn ? labelBn : labelEn}
      {showArrow && <Icon name="arrowRight" className="h-4 w-4" />}
    </Link>
  );
}
