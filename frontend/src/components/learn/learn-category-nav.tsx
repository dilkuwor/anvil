"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { CategoryIcon } from "@/components/learn/category-icon";
import { api } from "@/lib/api";
import type { LearningCategoryCard } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function LearnCategoryNav({ activeCategorySlug }: { activeCategorySlug?: string }) {
  const categories = useQuery({
    queryKey: queryKeys.learnCategories,
    queryFn: () => api.get<LearningCategoryCard[]>("/api/v1/learn/categories"),
  });

  const list = categories.data ?? [];
  const isAll = !activeCategorySlug;

  return (
    <nav aria-label="Learning Categories" className="relative -mx-1 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
      <div className="flex min-w-max items-center gap-1.5 px-1">
        <Link
          href="/learn"
          className={cn(
            "group inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-all",
            isAll
              ? "border-accent/40 bg-accent/15 text-accent shadow-2xs font-semibold"
              : "border-steel-800/80 bg-steel-900/60 text-muted-foreground hover:border-steel-700 hover:bg-steel-800 hover:text-foreground",
          )}
        >
          <LayoutGrid className={cn("h-3.5 w-3.5", isAll ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
          <span>All Categories</span>
        </Link>

        {list.map((cat) => {
          const active = activeCategorySlug === cat.slug;
          return (
            <Link
              key={cat.id}
              href={`/learn/${cat.slug}`}
              className={cn(
                "group inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-all",
                active
                  ? "border-accent/40 bg-accent/15 text-accent shadow-2xs font-semibold"
                  : "border-steel-800/80 bg-steel-900/60 text-muted-foreground hover:border-steel-700 hover:bg-steel-800 hover:text-foreground",
              )}
            >
              <span className={cn(active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")}>
                <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
              </span>
              <span>{cat.title}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-semibold",
                  active
                    ? "bg-accent/20 text-accent"
                    : "bg-steel-800 text-muted-foreground group-hover:text-foreground",
                )}
              >
                {cat.topic_count}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
