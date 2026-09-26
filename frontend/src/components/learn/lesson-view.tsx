"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  ListOrdered,
  Maximize2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AskAiButton, AskAiController, AskAiPanel } from "@/components/learn/ask-ai-panel";
import { LearnHierarchyBar } from "@/components/learn/learn-hierarchy-bar";
import { LessonCurriculum } from "@/components/learn/lesson-curriculum";
import { LessonOverlay } from "@/components/learn/lesson-overlay";
import { headingSlug, LessonMarkdown } from "@/components/learn/markdown";
import { TopicSidebar, useTopicSidebarCollapsed } from "@/components/learn/topic-sidebar";
import { NotesPanel } from "@/components/notes/notes-drawer";
import { ListenButton } from "@/components/tts/listen-button";
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
import { cn } from "@/lib/utils";

export function LessonView({ slug }: { slug: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useTopicSidebarCollapsed();
  const queryClient = useQueryClient();
  const { signedIn } = useSession();
  const [authPrompt, setAuthPrompt] = useState<AuthPromptKind | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

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
    enabled: Boolean(lesson.data?.topic_slug),
  });

  // Track reading scroll progress
  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setReadingProgress(100);
        return;
      }
      const percent = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setReadingProgress(percent);
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  const lessonData = lesson.data;

  // Keyboard navigation shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!lessonData) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "[" || (e.key === "ArrowLeft" && e.altKey)) {
        if (lessonData.previous) {
          e.preventDefault();
          window.location.href = lessonData.previous.href;
        }
      } else if (e.key === "]" || (e.key === "ArrowRight" && e.altKey)) {
        if (lessonData.next) {
          e.preventDefault();
          window.location.href = lessonData.next.href;
        }
      } else if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        if (signedIn && lessonData.status !== "COMPLETED") {
          e.preventDefault();
          complete.mutate();
        }
      } else if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        setCurriculumOpen((prev) => !prev);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setOverlayOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lessonData, signedIn, complete]);

  const lessonContent = lessonData?.content;
  // Extract headings from markdown content for the in-page TOC
  const headings = useMemo(() => {
    if (!lessonContent) return [];
    const headingRegex = /^##\s+(.+)$/gm;
    const result: { id: string; text: string }[] = [];
    let match;
    while ((match = headingRegex.exec(lessonContent)) !== null) {
      const raw = match[1].trim();
      result.push({
        id: headingSlug(raw),
        text: raw.replace(/^\d+\.\s*/, "").replace(/[*_`]/g, ""),
      });
    }
    return result;
  }, [lessonContent]);

  if (lesson.isLoading) return <CardSkeleton rows={8} />;
  if (lesson.isError || !lesson.data) {
    return <ErrorState message="Unable to load this lesson." onRetry={() => lesson.refetch()} />;
  }

  const data = lesson.data;
  const isCompleted = data.status === "COMPLETED";
  const firstProblem = data.related_problems[0];
  const topicLessons = topic.data?.lessons ?? [];
  const lessonIdx = topicLessons.findIndex((item) => item.slug === data.slug);

  const studyRail = (
    <>
      {/* On this page TOC (if there are headings) */}
      {headings.length > 1 ? (
        <SectionCard className="p-4">
          <SectionTitle>On this page</SectionTitle>
          <nav aria-label="Page sections" className="mt-2.5 space-y-1">
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="block truncate rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-steel-800/60 hover:text-foreground"
              >
                {h.text}
              </a>
            ))}
          </nav>
        </SectionCard>
      ) : null}

      {data.category_slug === "behavioral" ? (
        <SectionCard>
          <SectionTitle>Next step</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild size="sm" className="font-semibold">
              <Link href={`/behavioral#${data.topic_slug}`}>Write your STAR story</Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="font-semibold">
              <Link href="/behavioral">Mock Interview</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {firstProblem ? (
        <SectionCard>
          <SectionTitle>Next step</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild size="sm" className="font-semibold">
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
            <Button asChild size="sm" variant="secondary" className="font-semibold">
              <Link href={`/problems/${firstProblem.slug}`}>Mock Interview</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {data.takeaways.length ? (
        <SectionCard>
          <SectionTitle>Key takeaways</SectionTitle>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed">
            {data.takeaways.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="flex h-5 w-3.5 shrink-0 items-center justify-center">
                  <CircleCheck className="block h-3.5 w-3.5 text-emerald-400" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="min-w-0 break-words text-foreground/90 font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {data.interview_questions.length ? (
        <SectionCard>
          <SectionTitle>Interview questions</SectionTitle>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed">
            {data.interview_questions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="flex h-5 w-3.5 shrink-0 items-center justify-center">
                  <CircleHelp className="block h-3.5 w-3.5 text-accent" aria-hidden />
                </span>
                <span className="min-w-0 break-words text-foreground/90 font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {data.related_problems.length ? (
        <SectionCard className="p-0">
          <div className="p-4 pb-2">
            <SectionTitle>Related problems</SectionTitle>
          </div>
          <ul className="divide-y divide-steel-800/80 border-t border-steel-800/80">
            {data.related_problems.map((problem) => (
              <li key={problem.id}>
                <Link
                  href={`/problems/${problem.slug}`}
                  className="flex items-center justify-between gap-3 p-3.5 text-xs transition-colors hover:bg-steel-950/50"
                >
                  <span className="min-w-0 truncate font-semibold text-foreground hover:text-accent">{problem.title}</span>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );

  const page = (
    <div className="space-y-4">
      {/* Fixed top reading progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-accent transition-all duration-75 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Compact Hierarchy Bar */}
      <LearnHierarchyBar
        categorySlug={data.category_slug}
        categoryTitle={data.category_title}
        topicSlug={data.topic_slug}
        topicTitle={data.topic_title}
        lessonTitle={data.title}
        currentIndex={lessonIdx}
        totalLessons={topicLessons.length}
        estimatedMinutes={data.estimated_minutes}
        onOpenCurriculum={() => setCurriculumOpen(true)}
      />

      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Center Column: Main Learning Workspace & Bottom Controls */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Main Connected Reading Workspace Card */}
          <div className="flex flex-col lg:flex-row items-stretch rounded-2xl border border-steel-800/90 bg-steel-900/90 shadow-2xs overflow-hidden">
            {/* Attached Left Rail / Sidebar */}
            <TopicSidebar
              categorySlug={data.category_slug}
              activeTopicSlug={data.topic_slug}
              activeLessonSlug={data.slug}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Center Content Panel */}
            <div className="flex-1 min-w-0 p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-steel-800/80 pb-4">
                <h1 className="min-w-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{data.title}</h1>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-accent"
                    aria-label="Maximize lesson (M)"
                    title="Maximize (M)"
                    onClick={() => setOverlayOpen(true)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
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
              {signedIn && !overlayOpen ? <AskAiPanel /> : null}
              <LessonMarkdown content={data.content} />
            </div>
          </div>

          {/* On this page and takeaways on smaller screens */}
          <div className="space-y-4 xl:hidden">
            {studyRail}
          </div>

          {/* Floating action dock */}
          <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center">
            <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-steel-800/90 bg-steel-900/95 p-1.5 shadow-xl backdrop-blur-xl">
              <DockLink direction="previous" href={data.previous?.href} title={data.previous?.title} shortcut="[" />

              {topicLessons.length > 0 ? (
                <>
                  <DockDivider />
                  <div
                    className="flex items-center gap-2 px-2"
                    aria-label={`Lesson ${lessonIdx + 1} of ${topicLessons.length} in ${data.topic_title}`}
                    title={`Lesson ${lessonIdx + 1} of ${topicLessons.length}`}
                  >
                    <span className="hidden items-center gap-1 sm:flex" aria-hidden>
                      {topicLessons.map((item, i) => (
                        <span
                          key={item.id}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            i === lessonIdx
                              ? "w-4 bg-accent"
                              : item.status === "COMPLETED"
                                ? "w-1.5 bg-emerald-500/70"
                                : "w-1.5 bg-steel-700",
                          )}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                      {lessonIdx + 1}/{topicLessons.length}
                    </span>
                  </div>
                </>
              ) : null}

              <DockDivider />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground lg:hidden"
                onClick={() => setCurriculumOpen(true)}
              >
                <ListOrdered className="h-3.5 w-3.5 text-accent" />
                <span className="hidden sm:inline">Outline</span>
              </Button>

              {signedIn ? (
                <Button
                  size="sm"
                  variant={isCompleted ? "secondary" : "default"}
                  className={cn(
                    "h-9 gap-1.5 rounded-full px-4 text-xs font-bold transition-all",
                    isCompleted
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 disabled:opacity-100"
                      : "bg-accent text-white hover:bg-accent-light",
                  )}
                  disabled={complete.isPending || isCompleted}
                  onClick={() => complete.mutate()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isCompleted ? "Completed" : complete.isPending ? "Saving…" : "Mark Complete"}</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 rounded-full bg-accent px-4 text-xs font-bold text-white hover:bg-accent-light"
                  onClick={() => setAuthPrompt("progress")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Complete</span>
                </Button>
              )}

              <DockDivider />
              <DockLink
                direction="next"
                href={data.next?.href}
                title={data.next?.title}
                shortcut="]"
                highlight={isCompleted && Boolean(data.next)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Desktop XL Study Rail */}
        <aside className={cn("hidden w-72 shrink-0 space-y-4 xl:block xl:sticky xl:top-16", sidebarCollapsed && "xl:ml-5")}>
          {studyRail}
        </aside>
      </div>

      {curriculumOpen ? (
        <LessonCurriculum
          lesson={data}
          open={curriculumOpen}
          onClose={() => setCurriculumOpen(false)}
        />
      ) : null}
      {overlayOpen ? (
        <LessonOverlay
          lesson={data}
          signedIn={signedIn}
          onClose={() => setOverlayOpen(false)}
          onAskAiAuth={() => setAuthPrompt("ask-ai")}
        />
      ) : null}
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

function DockDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-steel-800" aria-hidden />;
}

function DockLink({
  direction,
  href,
  title,
  shortcut,
  highlight = false,
}: {
  direction: "previous" | "next";
  href?: string;
  title?: string;
  shortcut: string;
  highlight?: boolean;
}) {
  const isNext = direction === "next";
  const Arrow = isNext ? ChevronRight : ChevronLeft;
  const label = isNext ? "Next" : "Prev";
  const base = "flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors";

  if (!href) {
    return (
      <span className={cn(base, "cursor-not-allowed text-muted-foreground/40")} aria-disabled title={`No ${label.toLowerCase()} lesson`}>
        {!isNext ? <Arrow className="h-4 w-4" /> : null}
        <span className="hidden sm:inline">{label}</span>
        {isNext ? <Arrow className="h-4 w-4" /> : null}
      </span>
    );
  }

  return (
    <Link
      href={href}
      title={`${isNext ? "Next" : "Previous"}: ${title} (${shortcut})`}
      aria-label={`${isNext ? "Next" : "Previous"} lesson: ${title}`}
      className={cn(
        base,
        highlight
          ? "bg-accent text-white hover:bg-accent-light"
          : "text-muted-foreground hover:bg-steel-800 hover:text-foreground",
      )}
    >
      {!isNext ? <Arrow className="h-4 w-4" /> : null}
      <span className="hidden sm:inline">{label}</span>
      {isNext ? <Arrow className="h-4 w-4" /> : null}
    </Link>
  );
}
