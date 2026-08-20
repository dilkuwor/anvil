"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CircleCheck, CircleHelp, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AskAiButton, AskAiController, AskAiPanel } from "@/components/learn/ask-ai-panel";
import { NotesPanel } from "@/components/notes/notes-drawer";
import { LessonMarkdown } from "@/components/learn/markdown";
import { ListenButton } from "@/components/tts/listen-button";
import { Breadcrumbs } from "@/components/layout/page-header";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { LearningLessonDetail, LearningTopicDetail } from "@/lib/learn";
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
  const topic = useQuery({
    queryKey: queryKeys.learnTopic(lesson.data?.topic_slug ?? ""),
    queryFn: () => api.get<LearningTopicDetail>(`/api/v1/learn/topics/${lesson.data!.topic_slug}`),
    enabled: Boolean(lesson.data?.topic_slug && lesson.data.related_problems.length > 0),
  });

  if (lesson.isLoading) return <CardSkeleton rows={8} />;
  if (lesson.isError || !lesson.data) {
    return <ErrorState message="Unable to load this lesson." onRetry={() => lesson.refetch()} />;
  }

  const data = lesson.data;
  const firstProblem = data.related_problems[0];

  const page = (
      <div className="space-y-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Breadcrumbs
            items={[
              { href: "/learn", label: "Learn" },
              { href: `/learn/${data.category_slug}`, label: data.category_title },
              { href: `/learn/${data.category_slug}/${data.topic_slug}`, label: data.topic_title },
              { label: data.title },
            ]}
          />
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden />
              {data.category_title}
            </span>
            <span aria-hidden>·</span>
            <span>{data.topic_title}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" aria-hidden />
              {data.estimated_minutes} min read
            </span>
          </p>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <SectionCard className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-steel-800 pb-4">
              <h1 className="min-w-0 text-lg font-semibold tracking-tight">{data.title}</h1>
              <div className="flex shrink-0 items-center gap-1.5">
                <ListenButton
                  text={lessonSpeech({
                    title: data.title,
                    short_description: data.short_description,
                    content: data.content,
                    takeaways: data.takeaways,
                  })}
                />
                <NotesPanel
                  context={{ sourceType: "LESSON", sourceId: data.id, sourceTitle: data.title }}
                />
                {signedIn ? (
                  <AskAiButton />
                ) : (
                  <Button size="sm" onClick={() => setAuthPrompt("ask-ai")}>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Ask AI
                  </Button>
                )}
              </div>
            </div>
            {signedIn ? <AskAiPanel /> : null}
            <LessonMarkdown content={data.content} />
          </SectionCard>

          <aside className="space-y-4 xl:sticky xl:top-16">
            {firstProblem ? (
              <SectionCard>
                <SectionTitle>Next step</SectionTitle>
                <div className="mt-3 flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link
                      href={
                        topic.data?.practice_tag
                          ? `/problems?tag=${topic.data.practice_tag}`
                          : `/problems/${firstProblem.slug}`
                      }
                    >
                      Practice Problems
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/problems/${firstProblem.slug}`}>Mock Interview</Link>
                  </Button>
                </div>
              </SectionCard>
            ) : null}

            {data.takeaways.length ? (
              <SectionCard>
                <SectionTitle>Key takeaways</SectionTitle>
                <ul className="mt-3 space-y-2 text-[13px] leading-6">
                  {data.takeaways.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="flex h-6 w-3.5 shrink-0 items-center justify-center">
                        <CircleCheck className="block h-3.5 w-3.5 text-success" strokeWidth={2.25} aria-hidden />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {data.interview_questions.length ? (
              <SectionCard>
                <SectionTitle>Interview questions</SectionTitle>
                <ul className="mt-3 space-y-2 text-[13px] leading-6">
                  {data.interview_questions.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="flex h-6 w-3.5 shrink-0 items-center justify-center">
                        <CircleHelp className="block h-3.5 w-3.5 text-accent" aria-hidden />
                      </span>
                      <span>{item}</span>
                    </li>
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
