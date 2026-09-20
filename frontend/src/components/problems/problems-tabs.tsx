"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProblemsTabs({
  onCreate,
  activeTab,
}: {
  onCreate: () => void;
  activeTab?: "all" | "stories" | "lists";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lists = pathname.startsWith("/problems/lists");
  const isStories = !lists && (searchParams.get("view") === "stories" || searchParams.get("story") === "1");
  const active = activeTab ?? (lists ? "lists" : isStories ? "stories" : "all");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 items-center rounded-lg border border-steel-700/80 bg-steel-900/90 p-0.5 shadow-2xs">
        <Link
          href="/problems"
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-[13px] transition-all",
            active === "all"
              ? "border border-steel-700/60 bg-steel-800 font-semibold text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          All Problems
        </Link>
        <Link
          href="/problems?view=stories"
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] transition-all",
            active === "stories"
              ? "border border-steel-700/60 bg-steel-800 font-semibold text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span>Visual Stories</span>
          <span className="rounded-full bg-steel-700/60 px-1.5 py-0.2 text-[10px] font-medium tabular-nums text-foreground/80">
            21
          </span>
        </Link>
        <Link
          href="/problems/lists"
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-[13px] transition-all",
            active === "lists"
              ? "border border-steel-700/60 bg-steel-800 font-semibold text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
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
