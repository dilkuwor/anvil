"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProblemsTabs({ onCreate }: { onCreate: () => void }) {
  const pathname = usePathname();
  const lists = pathname.startsWith("/problems/lists");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 items-center rounded-lg border border-steel-700/80 bg-steel-900/90 p-0.5 shadow-2xs">
        <Link
          href="/problems"
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-[13px] transition-all",
            !lists ? "border border-steel-700/60 bg-steel-800 font-semibold text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          All Problems
        </Link>
        <Link
          href="/problems/lists"
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-[13px] transition-all",
            lists ? "border border-steel-700/60 bg-steel-800 font-semibold text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          My Lists
        </Link>
      </div>
      <Button size="sm" onClick={onCreate}>
        + Create List
      </Button>
    </div>
  );
}
