"use client";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { SystemDesignProblemCard } from "@/components/system-design/problem-card";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { useStartDesignInterview, useSystemDesignCatalog } from "@/lib/system-design-catalog";

export function ScenarioPicker() {
  const catalog = useSystemDesignCatalog();
  const interview = useStartDesignInterview();

  if (catalog.isLoading) return <CardSkeleton rows={6} />;
  if (catalog.isError) {
    return <ErrorState message="Unable to load system design scenarios." onRetry={() => catalog.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Design Interview"
        description="Same problems as Learn and the simulator. Pick one and walk requirements, capacity, and architecture."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(catalog.data ?? []).map((item) => (
          <SystemDesignProblemCard
            key={item.slug}
            item={item}
            primary="interview"
            onInterview={interview.startInterview}
            interviewing={interview.startingSlug === item.slug}
          />
        ))}
      </div>
      {interview.authOpen ? <AuthPrompt kind="mock" onClose={interview.closeAuth} /> : null}
    </div>
  );
}
