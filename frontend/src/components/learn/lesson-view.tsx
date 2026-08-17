"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AskAiButton, AskAiController, AskAiPanel } from "@/components/learn/ask-ai-panel";
import { LessonMarkdown } from "@/components/learn/markdown";
import { ListenButton } from "@/components/tts/listen-button";
import { Breadcrumbs } from "@/components/layout/page-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { LearningLessonDetail } from "@/lib/learn";
import { queryKeys } from "@/lib/queries";
import { lessonSpeech } from "@/lib/tts";
import { AuthPrompt } from "@/components/auth/auth-prompt";
import { useSession, type AuthPromptKind } from "@/lib/session";

export function LessonView({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const { signedIn } = useSession();
  const [authPrompt, setAuthPrompt] = useState<AuthPromptKind | null>(null);
  const lesson = useQuery({
    queryKey: queryKeys.learnLesson(slug),
    queryFn: () => api.get<LearningLessonDetail>(`/api/v1/learn/lessons/${slug}`),
  });

  const complete = useMutation({
    mutationFn: () => api.post<LearningLessonDetail>(`/api/v1/learn/lessons/${lesson.data?.id}/complete`),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.learnLesson(slug), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.learnTopic(data.topic_slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.learnCategory(data.category_slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.learnCategories });
      queryClient.invalidateQueries({ queryKey: queryKeys.learnProgress });
      toast.success("Lesson marked complete.");
    },
    onError: () => toast.error("Unable to update progress."),
  });

  if (lesson.isLoading) return <CardSkeleton rows={8} />;
  if (lesson.isError || !lesson.data) {
    return <ErrorState message="Unable to load this lesson." onRetry={() => lesson.refetch()} />;
  }

  const data = lesson.data;
  const firstProblem = data.related_problems[0];

  const page = (
      <div className="space-y-5">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { href: "/learn", label: "Learn" },
              { href: `/learn/${data.category_slug}`, label: data.category_title },
              { href: `/learn/${data.category_slug}/${data.topic_slug}`, label: data.topic_title },
              { label: data.title },
            ]}
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">{data.title}</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {data.category_title} · {data.topic_title} · {data.estimated_minutes} min read
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <ListenButton
                text={lessonSpeech({
                  title: data.title,
                  short_description: data.short_description,
                  content: data.content,
                  takeaways: data.takeaways,
                })}
              />
              {signedIn ? (
                <AskAiButton />
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setAuthPrompt("ask-ai")}>
                  Ask AI
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <SectionCard className="min-w-0">
            {signedIn ? <AskAiPanel /> : null}
            <LessonMarkdown content={data.content} />
          </SectionCard>

          <aside className="space-y-4 xl:sticky xl:top-16">
            {data.takeaways.length ? (
              <SectionCard>
                <SectionTitle>Key takeaways</SectionTitle>
                <ul className="mt-3 space-y-1.5 text-[13px] leading-6">
                  {data.takeaways.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {data.interview_questions.length ? (
              <SectionCard>
                <SectionTitle>Interview questions</SectionTitle>
                <ul className="mt-3 space-y-1.5 text-[13px] leading-6">
                  {data.interview_questions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {data.related_problems.length ? (
              <SectionCard className="p-0">
                <div className="px-5 pt-5">
                  <SectionTitle>Related problems</SectionTitle>
                </div>
                <ul className="mt-2 divide-y divide-steel-800">
                  {data.related_problems.map((problem) => (
                    <li key={problem.id}>
                      <Link
                        href={`/problems/${problem.slug}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-steel-950/50"
                      >
                        <span className="min-w-0 truncate">{problem.title}</span>
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 border-t border-steel-800 p-3">
                  {firstProblem ? (
                    <Button asChild size="sm">
                      <Link href={`/problems/${firstProblem.slug}`}>Practice {firstProblem.title}</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="secondary">
                    <Link href={firstProblem ? `/problems/${firstProblem.slug}` : "/problems"}>Mock Interview</Link>
                  </Button>
                </div>
              </SectionCard>
            ) : null}
          </aside>
        </div>

        <div className="sticky bottom-3 z-10 rounded-xl border border-steel-800 bg-steel-900/95 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {data.previous ? (
              <Button asChild variant="ghost" size="sm" className="max-w-[38%] justify-start">
                <Link href={data.previous.href} className="truncate">
                  ← {data.previous.title}
                </Link>
              </Button>
            ) : (
              <span className="px-2 text-[12px] text-muted-foreground">First lesson</span>
            )}
            {signedIn ? (
              <Button size="sm" disabled={complete.isPending || data.status === "COMPLETED"} onClick={() => complete.mutate()}>
                {data.status === "COMPLETED" ? "Completed" : complete.isPending ? "Saving…" : "Mark Complete"}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setAuthPrompt("progress")}>
                Mark Complete
              </Button>
            )}
            {data.next ? (
              <Button asChild variant="ghost" size="sm" className="max-w-[38%] justify-end">
                <Link href={data.next.href} className="truncate">
                  {data.next.title} →
                </Link>
              </Button>
            ) : (
              <span className="px-2 text-[12px] text-muted-foreground">Last lesson</span>
            )}
          </div>
        </div>
      {authPrompt ? <AuthPrompt kind={authPrompt} onClose={() => setAuthPrompt(null)} /> : null}
      </div>
  );

  return signedIn ? (
    <AskAiController key={data.id} lesson={data}>
      {page}
    </AskAiController>
  ) : (
    page
  );
}
