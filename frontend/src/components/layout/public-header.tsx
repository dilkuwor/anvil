import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";

export function PublicHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-steel-800 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm">
          <BrandMark compact />
        </Link>
        <div className="flex items-center gap-2">
          {action}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
