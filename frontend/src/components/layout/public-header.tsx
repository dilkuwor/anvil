"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/problems", label: "Problems" },
  { href: "/system-design", label: "Design" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
];

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label="Primary">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[13px] hover:text-foreground",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 w-full overflow-x-clip border-b border-steel-800 bg-background/90 backdrop-blur-md">
      <div className="ia-content min-w-0">
        <div className="flex h-12 min-w-0 items-center justify-between gap-3">
          <Link href="/" className="shrink-0 text-sm">
            <BrandMark compact wordmarkClassName="max-sm:sr-only" />
          </Link>
          <NavLinks className="hidden min-w-0 items-center gap-0.5 md:flex" />
          <div className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <Button asChild size="sm" variant="ghost" className="whitespace-nowrap">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
            </Button>
            <Button asChild size="sm" className="whitespace-nowrap">
              <Link href={`/register?next=${encodeURIComponent(pathname)}`}>Register</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
        <NavLinks className="flex h-10 w-full min-w-0 items-center gap-0.5 overflow-x-auto border-t border-steel-800 md:hidden" />
      </div>
    </header>
  );
}
