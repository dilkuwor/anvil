"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NoteBody } from "@/components/notes/note-body";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import type { Note } from "@/lib/notes";
import { queryKeys } from "@/lib/queries";
import { BOX_LABELS, nextDueLabel, useRateCard, useReviewQueue, type Rating, type ReviewCard } from "@/lib/study";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ReviewCard["kind"], { label: string; dot: string; text: string }> = {
  PROBLEM: { label: "Coding problem", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-300" },
  LESSON: { label: "Design concept", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-300" },
  DESIGN: { label: "Design question", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-300" },
};

type Outcome = { cardId: string; rating: Rating; box: number; nextDue: string; recallRate: number | null };

export function ReviewSession() {
  const queue = useReviewQueue();
  const rate = useRateCard();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [draft, setDraft] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  if (queue.isLoading) {
    return (
      <Shell>
        <CardSkeleton rows={4} />
      </Shell>
    );
  }
  if (queue.isError || !queue.data) {
    const message = queue.error instanceof ApiError ? queue.error.message : "Unable to load your reviews.";
    return (
      <Shell>
        <ErrorState message={message} onRetry={() => queue.refetch()} />
      </Shell>
    );
  }

  const cards = queue.data.cards;
  const finished = index >= cards.length;

  if (cards.length === 0) {
    return (
      <Shell>
        <SectionCard>
          <EmptyState
            title="Nothing to review right now"
            body="Every card is resting in its box. Solve a problem or finish a lesson and it comes back tomorrow."
            action={
              <Button asChild size="sm">
                <Link href="/today">Back to Today</Link>
              </Button>
            }
          />
        </SectionCard>
      </Shell>
    );
  }

  if (finished) {
    return (
      <Shell dots={cards.map((card, i) => dotColor(card, i, index, outcomes))} position="done">
        <Summary outcomes={outcomes} day={queue.data.day} boxes={queue.data.boxes} waiting={queue.data.due_total - cards.length} />
      </Shell>
    );
  }

  const card = cards[index];
  const kind = KIND_LABEL[card.kind];

  function submit(rating: Rating) {
    rate.mutate(
      { cardId: card.id, rating },
      {
        onSuccess: (result) => {
          setOutcomes((prev) => [
            ...prev,
            { cardId: card.id, rating, box: result.card.box, nextDue: result.next_due_on, recallRate: result.recall_rate },
          ]);
          setIndex((i) => i + 1);
          setShown(false);
          setDraft("");
        },
      },
    );
  }

  return (
    <Shell dots={cards.map((c, i) => dotColor(c, i, index, outcomes))} position={`${index + 1} of ${cards.length}`}>
      <ReviewKeys
        shown={shown}
        canReveal={!card.wants_text}
        busy={rate.isPending}
        onReveal={() => setShown(true)}
        onRate={submit}
      />
      <SectionCard className="flex flex-col gap-5 p-6 sm:p-8">
        <div className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]", kind.text)}>
          <span className={cn("h-2.5 w-2.5 rounded-full", kind.dot)} aria-hidden />
          {kind.label}
          <span className="font-medium normal-case tracking-normal text-muted-foreground">· {card.label}</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">{card.title}</h2>
        <p className="text-[17px] leading-relaxed text-foreground">{card.prompt}</p>

        {card.wants_text ? (
          <div className="space-y-1.5">
            <label htmlFor="review-draft" className="text-[12px] text-muted-foreground">
              Your words, no need to be neat
            </label>
            <textarea
              id="review-draft"
              rows={5}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full resize-none rounded-lg border border-steel-700/80 bg-steel-950/40 px-3 py-2 text-[15px] leading-relaxed text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ) : null}

        {shown ? (
          <div className="space-y-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{card.answer_label}</p>
            <p className="whitespace-pre-line text-[16px] leading-relaxed text-foreground">{card.answer}</p>
            {card.detail ? <p className="text-[13px] text-muted-foreground">Pattern: {card.detail}</p> : null}
            {card.note_source_type && card.note_source_id ? (
              <SourceNote sourceType={card.note_source_type} sourceId={card.note_source_id} />
            ) : null}
            <Link href={card.href} className="inline-block text-[13px] font-medium text-accent hover:underline">
              Open it →
            </Link>
          </div>
        ) : null}

        {!shown ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button size="lg" onClick={() => setShown(true)}>
              {card.wants_text ? "Compare" : "Show answer"}
            </Button>
            {!card.wants_text ? <p className="text-[11.5px] text-muted-foreground/80">Space to reveal</p> : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <p className="text-[12px] text-muted-foreground">How did that go?</p>
            <div className="grid w-full max-w-md grid-cols-3 gap-2.5">
              <RateButton tone="forgot" onClick={() => submit("forgot")} disabled={rate.isPending}>
                Forgot
              </RateButton>
              <RateButton tone="shaky" onClick={() => submit("shaky")} disabled={rate.isPending}>
                Shaky
              </RateButton>
              <RateButton tone="good" onClick={() => submit("good")} disabled={rate.isPending}>
                Got it
              </RateButton>
            </div>
            <p className="text-[11.5px] text-muted-foreground/80">
              Forgot: back tomorrow · Shaky: same box · Got it: up a box · keys 1 2 3
            </p>
          </div>
        )}
      </SectionCard>
    </Shell>
  );
}

/** Space reveals the answer; 1, 2 and 3 rate it. Ignored while typing in a text box. */
function ReviewKeys({
  shown,
  canReveal,
  busy,
  onReveal,
  onRate,
}: {
  shown: boolean;
  canReveal: boolean;
  busy: boolean;
  onReveal: () => void;
  onRate: (rating: Rating) => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!shown && canReveal && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        onReveal();
        return;
      }
      if (shown && !busy) {
        const rating = ({ "1": "forgot", "2": "shaky", "3": "good" } as Record<string, Rating>)[event.key];
        if (rating) {
          event.preventDefault();
          onRate(rating);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, canReveal, busy, onReveal, onRate]);
  return null;
}

function Shell({ children, dots, position }: { children: React.ReactNode; dots?: string[]; position?: string }) {
  return (
    <main className="ia-content py-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/today" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Today
          </Link>
          {dots ? (
            <div className="flex gap-2" aria-label="Progress">
              {dots.map((color, i) => (
                <span key={i} className={cn("h-2.5 w-2.5 rounded-full", color)} />
              ))}
            </div>
          ) : null}
          <span className="text-[13px] tabular-nums text-muted-foreground">{position ? `Review · ${position}` : "Review"}</span>
        </div>
        {children}
      </div>
    </main>
  );
}

function dotColor(card: ReviewCard, i: number, index: number, outcomes: Outcome[]): string {
  const outcome = outcomes.find((o) => o.cardId === card.id);
  if (outcome) {
    if (outcome.rating === "forgot") return "bg-coral";
    if (outcome.rating === "shaky") return "bg-amber-500";
    return "bg-teal";
  }
  return i === index ? "bg-accent" : "bg-steel-700";
}

function RateButton({
  tone,
  onClick,
  disabled,
  children,
}: {
  tone: "forgot" | "shaky" | "good";
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const style = {
    forgot: "border-coral/35 bg-coral/10 text-coral hover:bg-coral/15",
    shaky: "border-amber-500/35 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
    good: "border-teal/35 bg-teal/10 text-teal hover:bg-teal/15",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-12 rounded-xl border text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50",
        style,
      )}
    >
      {children}
    </button>
  );
}

function SourceNote({ sourceType, sourceId }: { sourceType: string; sourceId: string }) {
  const notes = useQuery({
    queryKey: queryKeys.notes(sourceType, sourceId),
    queryFn: () =>
      api.get<Note[]>(`/api/v1/notes?source_type=${encodeURIComponent(sourceType)}&source_id=${encodeURIComponent(sourceId)}`),
  });
  const note = notes.data?.[0];
  if (!note || !note.body.trim()) return null;
  return (
    <div className="border-t border-accent/20 pt-3 text-[13px] text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Your note</p>
      <NoteBody content={note.body} compact />
    </div>
  );
}

function Summary({
  outcomes,
  day,
  boxes,
  waiting,
}: {
  outcomes: Outcome[];
  day: string;
  boxes: Record<string, number>;
  waiting: number;
}) {
  const climbed = outcomes.filter((o) => o.rating === "good").length;
  const back = outcomes.filter((o) => o.rating === "forgot").length;
  const recallRate = outcomes.length ? outcomes[outcomes.length - 1].recallRate : null;
  const soonest = outcomes.map((o) => o.nextDue).sort()[0];
  const total = Object.values(boxes).reduce((sum, count) => sum + count, 0) || 1;
  return (
    <SectionCard className="flex flex-col items-center gap-5 border-teal/35 bg-teal/5 p-8 text-center">
      <p className="text-2xl font-bold text-teal">Review done</p>
      <div className="flex items-end gap-2.5" aria-label="Cards per box">
        {[1, 2, 3, 4, 5].map((box) => {
          const count = boxes[String(box)] ?? 0;
          const height = 36 + Math.round((count / total) * 48) + box * 6;
          return (
            <div key={box} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex w-14 items-end justify-center rounded-lg border-2 pb-1.5 text-[13px] font-bold sm:w-16",
                  count ? "border-teal bg-teal/15 text-teal" : "border-steel-800 bg-steel-900/40 text-transparent",
                )}
                style={{ height }}
              >
                {count || "0"}
              </div>
              <span className="text-[11px] text-muted-foreground">{BOX_LABELS[box]}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[15px] text-foreground">
        {climbed} card{climbed === 1 ? "" : "s"} climbed a box
        {back ? `, ${back} back tomorrow` : ""}.
      </p>
      <p className="text-[13px] text-muted-foreground">
        {waiting > 0 ? `${waiting} more waiting for the next days. ` : ""}
        {soonest ? `Next review: ${nextDueLabel(soonest, day)}.` : ""}
      </p>
      {recallRate !== null ? (
        <p className="text-[13px] text-muted-foreground">
          Recall rate, last 14 days: <span className="font-semibold text-foreground">{Math.round(recallRate * 100)}%</span>
          {recallRate < 0.8 ? " · a little low, the intervals may be long for you" : recallRate > 0.95 ? " · high, you could review less" : " · on target (85–90% is ideal)"}
        </p>
      ) : null}
      <Button asChild>
        <Link href="/today">Back to Today</Link>
      </Button>
    </SectionCard>
  );
}
