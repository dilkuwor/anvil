import { Sparkles } from "lucide-react";
import { Meter } from "@/components/dashboard/meter";
import { Badge } from "@/components/ui/badge";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { InterviewReadiness as Readiness } from "@/lib/api";

export function InterviewReadiness({ data }: { data: Readiness | null }) {
  const readinessBadge = data ? (
    data.overall >= 75 ? (
      <Badge variant="success" size="sm">Interview Ready</Badge>
    ) : data.overall >= 40 ? (
      <Badge variant="medium" size="sm">Building Up</Badge>
    ) : (
      <Badge variant="default" size="sm">Early Stage</Badge>
    )
  ) : null;

  return (
    <SectionCard className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <SectionTitle>Interview Readiness</SectionTitle>
          {readinessBadge}
        </div>
        {!data ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Estimated from coverage, difficulty mix, topics, and consistency — not an interview score. Solve a
            problem to generate a baseline.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{data.overall}%</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Score</span>
              </div>
              <Sparkles className="h-5 w-5 text-accent opacity-80" />
            </div>
            <p className="text-[12px] leading-5 text-muted-foreground">{data.blurb}</p>
            <ul className="space-y-3 pt-1">
              {data.factors.map((factor) => (
                <li key={factor.key}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-foreground/90 font-medium">{factor.label}</span>
                    <span className="tabular-nums font-semibold text-muted-foreground">{factor.percent}%</span>
                  </div>
                  <Meter value={factor.percent} label={factor.label} tone="bg-accent" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
