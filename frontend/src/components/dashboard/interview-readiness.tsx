import { Meter } from "@/components/dashboard/meter";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import type { InterviewReadiness as Readiness } from "@/lib/api";

export function InterviewReadiness({ data }: { data: Readiness | null }) {
  return (
    <SectionCard className="h-full">
      <SectionTitle>Interview Readiness</SectionTitle>
      {!data ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Estimated from coverage, difficulty mix, topics, and consistency — not an interview score. Solve a
          problem to generate a baseline.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] text-muted-foreground">Overall</div>
              <div className="text-3xl font-semibold tabular-nums tracking-tight">{data.overall}%</div>
            </div>
          </div>
          <p className="text-[12px] leading-5 text-muted-foreground">{data.blurb}</p>
          <ul className="space-y-2.5">
            {data.factors.map((factor) => (
              <li key={factor.key}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>{factor.label}</span>
                  <span className="tabular-nums text-muted-foreground">{factor.percent}%</span>
                </div>
                <Meter value={factor.percent} label={factor.label} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
