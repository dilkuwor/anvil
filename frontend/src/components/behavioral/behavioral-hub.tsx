"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, NotebookPen, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { NotesPanel } from "@/components/notes/notes-drawer";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { BehavioralQuestion, BehavioralTrack, InterviewSession } from "@/lib/interview";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const STAR = [
  { letter: "S", label: "Situation", body: "One sentence of context. Where, when, what was at stake." },
  { letter: "T", label: "Task", body: "What you were responsible for, specifically." },
  { letter: "A", label: "Action", body: "What you did, in the first person. Most of the answer lives here." },
  { letter: "R", label: "Result", body: "A number, then what you learned or changed." },
];

export function BehavioralHub() {
  const router = useRouter();
  const { signedIn } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [track, setTrack] = useState("general");

  const questions = useQuery({
    queryKey: queryKeys.behavioralQuestions,
    queryFn: () => api.get<BehavioralQuestion[]>("/api/v1/interviews/behavioral/questions"),
  });
  const tracks = useQuery({
    queryKey: queryKeys.behavioralTracks,
    queryFn: () => api.get<BehavioralTrack[]>("/api/v1/interviews/behavioral/tracks"),
  });

  const start = useMutation({
    mutationFn: async (slug: string) => {
      const active = await api.get<{ session: InterviewSession | null }>(
        `/api/v1/interviews/behavioral/active?track=${encodeURIComponent(slug)}`,
      );
      if (active.session) return active.session;
      return api.post<InterviewSession>("/api/v1/interviews/behavioral", { track: slug });
    },
    onSuccess: (session) => router.push(`/behavioral/interview?id=${session.id}`),
    onError: () => toast.error("Unable to start the behavioral interview."),
  });

  function startInterview() {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    start.mutate(track);
  }

  if (questions.isLoading || tracks.isLoading) return <CardSkeleton rows={6} />;
  if (questions.isError || tracks.isError) {
    return <ErrorState message="Unable to load the behavioral question bank." onRetry={() => void questions.refetch()} />;
  }

  const bank = questions.data ?? [];
  const byCompetency = new Map<string, BehavioralQuestion[]>();
  for (const item of bank) {
    byCompetency.set(item.competency, [...(byCompetency.get(item.competency) ?? []), item]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Behavioral Interviews"
          description="Build a bank of STAR stories, then sit a mock loop where the interviewer probes each one the way a hiring manager would."
        />
        <NotesPanel match="type" context={{ sourceType: "BEHAVIORAL", sourceId: "general", sourceTitle: "Behavioral Stories" }} />
      </div>

      <article className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-steel-900 via-steel-900 to-accent/10 p-6 shadow-md">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-3 py-0.5 text-[11px] font-bold text-accent shadow-xs">
          <MessageSquare className="h-3 w-3" />
          Mock Interview
        </div>
        <h2 className="mt-2.5 text-lg font-bold tracking-tight text-foreground">Pick a track and tell four stories</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          An opener plus three competency questions, each followed by a probing follow-up. About twenty minutes. You are scored on
          STAR structure, specificity, ownership, results, and reflection.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(tracks.data ?? []).map((item) => (
            <button
              key={item.slug}
              type="button"
              aria-pressed={track === item.slug}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                track === item.slug ? "border-accent/60 bg-accent/10" : "border-steel-800 bg-background/40 hover:border-steel-700",
              )}
              onClick={() => setTrack(item.slug)}
            >
              <div className="text-sm font-semibold">{item.title}</div>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.summary}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" className="gap-2 shadow-sm" disabled={start.isPending} onClick={startInterview}>
            <Play className="h-4 w-4 fill-current" />
            {start.isPending ? "Starting…" : "Start mock interview"}
          </Button>
          <span className="text-[12px] text-muted-foreground">Resumes an open session on the same track.</span>
        </div>
      </article>

      <section className="rounded-2xl border border-steel-800 bg-steel-900 p-5">
        <h2 className="text-sm font-semibold tracking-tight">The shape of every answer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {STAR.map((item) => (
            <div key={item.letter} className="rounded-xl border border-steel-800 bg-background/40 px-4 py-3">
              <div className="text-lg font-bold text-accent">{item.letter}</div>
              <div className="text-[13px] font-semibold">{item.label}</div>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
          Write six stories before your loop: a win, a failure, a conflict, an incident, an ambiguous project, and a hard call. Each
          one answers several of the questions below depending on what you stress.{" "}
          <Link href="/learn/behavioral/star-story-bank/star-story-bank" className="text-accent hover:underline">
            How to build the bank →
          </Link>
        </p>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Question bank</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              One question per competency, with the follow-ups an interviewer keeps in their pocket and what a strong answer contains.
              Save your story for each one; it shows up in Notes as a STAR story.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[...byCompetency.entries()].map(([competency, items]) => (
            <article key={competency} id={competency} className="flex flex-col rounded-2xl border border-steel-800 bg-steel-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{items[0].competency_title}</div>
                <NotesPanel
                  context={{ sourceType: "BEHAVIORAL", sourceId: competency, sourceTitle: `STAR story · ${items[0].competency_title}` }}
                />
              </div>
              {items.map((item) => (
                <div key={item.slug} className="mt-2">
                  <p className="text-[13px] font-medium leading-6">{item.question}</p>
                  <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">They will follow up with</div>
                  <ul className="mt-1 space-y-1 text-[12px] italic leading-5 text-foreground/80">
                    {item.probes.map((probe) => (
                      <li key={probe}>“{probe}”</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">A strong answer</div>
                  <ul className="mt-1 space-y-1 text-[12px] leading-5 text-muted-foreground">
                    {item.looking_for.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/learn/behavioral/${items[0].learn_slug}/${items[0].learn_slug}`}>Learn</Link>
                </Button>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  <NotebookPen className="h-3.5 w-3.5" />
                  Save your story with the notes icon above
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {authOpen ? <AuthPrompt kind="mock" onClose={() => setAuthOpen(false)} /> : null}
    </div>
  );
}
