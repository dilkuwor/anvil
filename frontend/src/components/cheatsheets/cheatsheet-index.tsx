"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { CheatSheetCard } from "@/lib/cheatsheets";
import { queryKeys } from "@/lib/queries";

export function CheatSheetIndex() {
  const sheets = useQuery({
    queryKey: queryKeys.cheatSheets,
    queryFn: () => api.get<CheatSheetCard[]>("/api/v1/cheatsheets"),
  });

  if (sheets.isLoading) return <CardSkeleton />;
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
          <SectionCard key={sheet.id} className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight">{sheet.title}</h2>
            <p className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">{sheet.description}</p>
            <p className="mt-4 text-[12px] tabular-nums text-muted-foreground">
              {sheet.section_count} sections · ~{sheet.estimated_minutes} min review
            </p>
            <Link href={sheet.href} className="mt-3 text-[13px] font-medium text-accent hover:text-accent-light">
              Open Cheat Sheet →
            </Link>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
