"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DesktopNav, MobileNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 w-full overflow-x-clip border-b border-steel-800 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="ia-content relative min-w-0">
        <div className="flex h-12 min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="shrink-0 text-sm">
              <BrandMark compact wordmarkClassName="max-md:sr-only" />
            </Link>
            <DesktopNav pathname={pathname} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <ThemeToggle />
            <div className="hidden items-center gap-1.5 md:flex">
              <Button asChild size="sm" variant="ghost" className="whitespace-nowrap">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
              </Button>
              <Button asChild size="sm" className="whitespace-nowrap">
                <Link href={`/register?next=${encodeURIComponent(pathname)}`}>Register</Link>
              </Button>
            </div>
            <MobileNav signedIn={false} nextPath={pathname} />
          </div>
        </div>
      </div>
    </header>
  );
}
