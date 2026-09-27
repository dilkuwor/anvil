"use client";

import { AlertTriangle, ChevronDown, CircleDot } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StateMark } from "@/components/dashboard/memory-card";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { nextDueLabel, quizHref, useProgress, type ProgressGroup, type ProgressItem } from "@/lib/study";
import { cn } from "@/lib/utils";

/**
 * Where you really stand: every lesson by category, first-try recall, what you were sure about
 * and got wrong, and quiz actions. Items carry a kind so coding problems can join the same table.
 */
export function LearnProgress() {
  const progress = useProgress();
  const [needsAttention, setNeedsAttention] = useState(false);
  if (progress.isLoading) return <CardSkeleton rows={6} />;
  if (progress.isError || !progress.data) {
    return <ErrorState message="Unable to load your progress." onRetry={() => progress.refetch()} />;
  }
  const { groups, sure_but_wrong: sureButWrong } = progress.data;
  const today = new Date().toISOString().slice(0, 10);
  const anyActivity = groups.some((group) => group.checked > 0);

  return (
    <div className="space-y-5">
      {sureButWrong.length ? (
        <SectionCard className="border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
            <SectionTitle>Sure, but wrong</SectionTitle>
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Questions you answered with confidence and missed. These are the gaps you do not feel. Each links to the part of
            the lesson that explains it.
          </p>
          <ul className="mt-3 divide-y divide-steel-800/80">
            {sureButWrong.map((miss) => (
              <li key={`${miss.href}-${miss.prompt}`} className="py-2.5">
                <Link href={miss.href} className="group block">
                  <p className="text-[13.5px] leading-relaxed text-foreground group-hover:text-accent">{miss.prompt}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {miss.item_title}
                    {miss.times > 1 ? ` · missed with confidence ${miss.times} times` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {anyActivity
            ? "Checked lessons carry their questions into spaced review. Unchecked ones are waiting for you."
            : "Finish a lesson's knowledge check and it shows up here with its recall and review dates."}
        </p>
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={needsAttention}
            onChange={(event) => setNeedsAttention(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Needs attention only
        </label>
      </div>

      {groups.map((group) => (
        <CategoryGroup key={group.slug} group={group} today={today} needsAttention={needsAttention} />
      ))}
    </div>
  );
}

function needsAttentionItem(item: ProgressItem, today: string): boolean {
  if (item.needs_refresh) return true;
  if (item.next_due_on && item.next_due_on <= today) return true;
  return item.first_try_total > 0 && item.first_try_correct < item.first_try_total;
}

function CategoryGroup({ group, today, needsAttention }: { group: ProgressGroup; today: string; needsAttention: boolean }) {
  const [open, setOpen] = useState(group.checked > 0);
  const rows = needsAttention ? group.items.filter((item) => needsAttentionItem(item, today)) : group.items;
  if (needsAttention && !rows.length) return null;
  const withQuestions = group.items.filter((item) => item.questions > 0).length;

  return (
    <SectionCard className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <button type="button" className="flex items-center gap-2 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
          <SectionTitle>{group.category}</SectionTitle>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            {group.checked} of {group.total} checked
            {withQuestions < group.total ? ` · ${withQuestions} with questions` : ""}
          </span>
        </button>
        {group.quiz_scope ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold">
            <Link href={quizHref(group.quiz_scope)}>
              <CircleDot className="h-3.5 w-3.5 text-accent" />
              Quiz this category
            </Link>
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="overflow-x-auto border-t border-steel-800/80">
          <table className="w-full min-w-[40rem] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">Lesson</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">First try</th>
                <th className="px-3 py-2 font-medium">Reviews</th>
                <th className="px-3 py-2 font-medium">Next</th>
                <th className="px-5 py-2 text-right font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-800/80">
              {rows.map((item) => (
                <tr key={item.slug} className="hover:bg-steel-950/50">
                  <td className="px-5 py-2.5">
                    <Link
                      href={item.href}
                      className={cn("font-medium hover:text-accent", item.learn_state === "not_started" ? "text-muted-foreground" : "text-foreground")}
                    >
                      {item.title}
                    </Link>
                    <span className="ml-2 hidden text-[11px] text-muted-foreground/80 xl:inline">{item.topic}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <StateMark lesson={item} />
                      <span className="capitalize">{item.needs_refresh ? "needs a refresh" : item.learn_state.replace("_", " ")}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {item.first_try_total > 0 ? (
                      <FirstTry correct={item.first_try_correct} total={item.first_try_total} />
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {item.cards ? `${item.reviews} · ${item.cards} q` : item.questions ? `${item.questions} q` : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {item.next_due_on ? nextDueLabel(item.next_due_on, today) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {item.quiz_scope ? (
                      <Link href={quizHref(item.quiz_scope)} className="text-[12px] font-medium text-accent hover:underline">
                        Quiz
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}

/** "6 of 8" with a short bar. A count, never a percentage. */
function FirstTry({ correct, total }: { correct: number; total: number }) {
  const width = Math.round((correct / total) * 100);
  return (
    <span className="inline-flex items-center gap-2" title={`${correct} of ${total} right on the first try`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-steel-800">
        <span
          className={cn("block h-full rounded-full", correct === total ? "bg-emerald-400" : "bg-accent")}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="tabular-nums text-muted-foreground">
        {correct} of {total}
      </span>
    </span>
  );
}
