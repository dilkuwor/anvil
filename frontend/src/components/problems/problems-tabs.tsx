"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProblemsTabs({ onCreate }: { onCreate: () => void }) {
  const pathname = usePathname();
  const lists = pathname.startsWith("/problems/lists");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-steel-800 p-0.5">
        <Link
          href="/problems"
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px]",
            !lists ? "bg-steel-800 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          All Problems
        </Link>
        <Link
          href="/problems/lists"
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px]",
            lists ? "bg-steel-800 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
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
