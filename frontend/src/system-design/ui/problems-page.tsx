"use client";

import Link from "next/link";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { SystemDesignProblemCard } from "@/components/system-design/problem-card";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { useStartDesignInterview, useSystemDesignCatalog } from "@/lib/system-design-catalog";

export function ProblemsPage() {
  const catalog = useSystemDesignCatalog();
  const interview = useStartDesignInterview();

  if (catalog.isLoading) return <CardSkeleton rows={6} />;
  if (catalog.isError) {
    return <ErrorState message="Unable to load system design problems." onRetry={() => catalog.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Design Problems"
        description="One catalog. Learn the walkthrough, simulate the architecture, or sit the mock interview."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {(catalog.data ?? []).map((item) => (
          <SystemDesignProblemCard
            key={item.slug}
            item={item}
            primary="simulate"
            onInterview={interview.startInterview}
            interviewing={interview.startingSlug === item.slug}
          />
        ))}
      </div>
      <Link href="/system-design" className="text-[13px] text-muted-foreground hover:text-accent">
        ← System Design
      </Link>
      {interview.authOpen ? <AuthPrompt kind="mock" onClose={interview.closeAuth} /> : null}
    </div>
  );
}
