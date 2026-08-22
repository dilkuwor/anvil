"use client";

import { BookOpen, ChevronRight, Clock, ListOrdered } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LearnHierarchyBar({
  categorySlug,
  categoryTitle,
  topicSlug,
  topicTitle,
  lessonTitle,
  currentIndex,
  totalLessons,
  estimatedMinutes,
  onOpenCurriculum,
  className,
}: {
  categorySlug: string;
  categoryTitle: string;
  topicSlug?: string;
  topicTitle?: string;
  lessonTitle?: string;
  currentIndex?: number;
  totalLessons?: number;
  estimatedMinutes?: number;
  onOpenCurriculum?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs", className)}>
      <nav aria-label="Course hierarchy" className="flex min-w-0 flex-wrap items-center gap-1.5 text-muted-foreground font-medium">
        <Link href="/learn" className="transition-colors hover:text-foreground">
          Learn
        </Link>
        <ChevronRight className="h-3 w-3 opacity-40 shrink-0" aria-hidden />

        <Link
          href={`/learn/${categorySlug}`}
          className={cn(
            "transition-colors hover:text-foreground truncate max-w-[12rem] sm:max-w-none",
            !topicSlug && "text-foreground font-semibold",
          )}
        >
          {categoryTitle}
        </Link>

        {topicSlug && topicTitle ? (
          <>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" aria-hidden />
            <Link
              href={`/learn/${categorySlug}/${topicSlug}`}
              className={cn(
                "transition-colors hover:text-foreground truncate max-w-[12rem] sm:max-w-none",
                !lessonTitle && "text-foreground font-semibold",
              )}
            >
              {topicTitle}
            </Link>
          </>
        ) : null}

        {lessonTitle ? (
          <>
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" aria-hidden />
            <span className="text-foreground font-semibold truncate max-w-[14rem] sm:max-w-[20rem]">
              {lessonTitle}
            </span>
          </>
        ) : null}
      </nav>

      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {onOpenCurriculum ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
            onClick={onOpenCurriculum}
          >
            <ListOrdered className="h-3.5 w-3.5 text-accent" />
            <span>Outline</span>
            {totalLessons && totalLessons > 0 ? (
              <span className="rounded-full bg-steel-800 px-1.5 py-0.2 text-[10px] tabular-nums font-bold text-foreground">
                {currentIndex !== undefined ? currentIndex + 1 : 1}/{totalLessons}
              </span>
            ) : null}
          </Button>
        ) : null}

        {estimatedMinutes ? (
          <span className="hidden items-center gap-1 sm:inline-flex text-[11px] text-muted-foreground font-medium">
            <Clock className="h-3 w-3 text-accent" aria-hidden />
            {estimatedMinutes} min read
          </span>
        ) : null}
      </div>
    </div>
  );
}
