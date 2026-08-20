import Link from "next/link";

import { LegalLinks } from "@/components/layout/legal-links";
import { BrandMark } from "@/components/ui/section";

const FOOTER_NAV = [
  { href: "/about", label: "About" },
  { href: "/problems", label: "Problems" },
  { href: "/system-design", label: "System Design" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
  { href: "/notes", label: "Notes" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-steel-800">
      <div className="ia-content flex flex-col gap-5 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Link href="/" className="inline-block text-sm">
            <BrandMark compact wordmark="Anvil" />
          </Link>
          <p className="text-[13px] leading-6 text-muted-foreground">
            Build skills. Break limits. Ace the interview.
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <p>© 2026 ByteTech LLC. All rights reserved.</p>
            <span aria-hidden>·</span>
            <LegalLinks className="text-[12px]" />
          </div>
        </div>
        <nav className="flex flex-wrap items-center text-[13px] text-muted-foreground" aria-label="Footer">
          {FOOTER_NAV.map((item, index) => (
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
        </nav>
      </div>
    </footer>
  );
}
