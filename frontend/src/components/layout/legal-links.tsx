"use client";

import Link from "next/link";

import { isAnalyticsEnabled } from "@/lib/analytics";
import { resetAnalyticsConsent } from "@/lib/consent";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav className={cn("flex flex-wrap items-center text-[13px] text-muted-foreground", className)} aria-label="Legal">
      {LINKS.map((item, index) => (
        <span key={item.href} className="inline-flex items-center">
          {index > 0 ? (
            <span aria-hidden className="px-2">
              ·
            </span>
          ) : null}
          <Link href={item.href} className="hover:text-foreground">
            {item.label}
          </Link>
        </span>
      ))}
      {isAnalyticsEnabled ? (
        <span className="inline-flex items-center">
          <span aria-hidden className="px-2">
            ·
          </span>
          <button type="button" className="hover:text-foreground" onClick={() => resetAnalyticsConsent()}>
            Cookie settings
          </button>
        </span>
      ) : null}
    </nav>
  );
}
