"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { CheatSheetCard } from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";

import { ArrowRight, BookOpen, Clock, FileText } from "lucide-react";

export function CheatSheetIndex() {
  const sheets = useQuery({
    queryKey: queryKeys.cheatSheets,
    queryFn: () => api.get<CheatSheetCard[]>("/api/v1/cheatsheets"),
  });

  if (sheets.isLoading) return <CardSkeleton rows={4} />;
  if (sheets.isError || !sheets.data) {
    return <ErrorState message="Unable to load cheat sheets." onRetry={() => sheets.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cheat Sheets"
        description="Dense review for the night before — or the hour before — an interview."
        meta={`${sheets.data.length} sheets`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {sheets.data.map((sheet) => (
          <Link
            key={sheet.id}
            href={sheet.href}
            className="group flex flex-col justify-between rounded-2xl border border-steel-800/90 bg-steel-900/90 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-steel-900 hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent transition-all duration-200 group-hover:scale-105 group-hover:border-accent/40 group-hover:bg-accent/15 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                  <BookOpen className="h-4.5 w-4.5" />
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-steel-700/60 bg-steel-800/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ~{sheet.estimated_minutes} min
                </span>
              </div>
              <h2 className="mt-3.5 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-accent">
                {sheet.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{sheet.description}</p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-steel-800/70 pt-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {sheet.section_count} sections
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-accent transition-transform group-hover:translate-x-1">
                Open Sheet
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
