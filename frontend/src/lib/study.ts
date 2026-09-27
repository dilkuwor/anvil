import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type Rating = "forgot" | "shaky" | "good";
export type CardKind = "PROBLEM" | "LESSON" | "DESIGN" | "CHECK" | "PATTERN";
export type Confidence = "sure" | "unsure";

export type StudyTask = {
  id: string;
  kind: "review" | "problem" | "design" | "optional" | string;
  title: string;
  why: string;
  minutes: number;
  href: string;
  action: string;
  done: boolean;
  manual: boolean;
  optional: boolean;
  ref: string;
};

export type TodayPlan = {
  day: string;
  unit_number: number;
  unit_title: string;
  tasks: StudyTask[];
  done_count: number;
  total: number;
  due_reviews: number;
  all_done: boolean;
  finish_line: string;
  pacing: string;
  readiness: number | null;
  recall_rate: number | null;
};

export type ReviewCard = {
  id: string;
  kind: CardKind;
  ref: string;
  box: number;
  due_on: string;
  title: string;
  label: string;
  prompt: string;
  answer: string;
  answer_label: string;
  detail: string;
  href: string;
  note_source_type: string | null;
  note_source_id: string | null;
  wants_text: boolean;
  /** Knowledge-check cards: the options to pick from; the right one arrives only after answering. */
  check_kind?: "choice" | "spot_mistake" | "short_answer" | null;
  options?: string[];
  section?: string | null;
};

export type ReviewQueue = {
  day: string;
  cards: ReviewCard[];
  due_total: number;
  boxes: Record<string, number>;
  practice?: boolean;
  scope_title?: string | null;
};

export type ProgressItem = {
  kind: "lesson" | "problem";
  slug: string;
  title: string;
  href: string;
  topic: string;
  topic_slug: string;
  learn_state: "not_started" | "learning" | "checked" | "mastered";
  needs_refresh: boolean;
  questions: number;
  first_try_correct: number;
  first_try_total: number;
  cards: number;
  reviews: number;
  last_reviewed_on: string | null;
  next_due_on: string | null;
  quiz_scope: string | null;
};
export type ProgressGroup = { category: string; slug: string; items: ProgressItem[]; checked: number; total: number; quiz_scope: string | null };
export type SureButWrong = { kind: string; prompt: string; item_title: string; href: string; when: string; times: number };
export type Progress = { groups: ProgressGroup[]; sure_but_wrong: SureButWrong[] };

export type RateResult = {
  card: ReviewCard;
  remaining: number;
  next_due_on: string;
  recall_rate: number | null;
  recall_reviews: number;
};

export type AnswerCardResult = RateResult & {
  correct: boolean;
  correct_index: number;
  explanation: string;
  learn_state: string;
  needs_refresh: boolean;
};

export type MemoryDay = { day: string; due: number };
export type MemoryLesson = {
  slug: string;
  title: string;
  category: string;
  href: string;
  learn_state: "not_started" | "learning" | "checked" | "mastered";
  needs_refresh: boolean;
  cards: number;
  reviews: number;
  next_due_on: string | null;
  last_reviewed_on: string | null;
};
export type WeakSpot = { concept: string; misses: number; lesson_title: string; href: string };
export type Memory = { week: MemoryDay[]; lessons: MemoryLesson[]; weak: WeakSpot[]; due_today: number };

export type ReadinessPoint = { day: string; readiness: number; coverage: number; retention: number | null };
export type Readiness = {
  readiness: number;
  coverage: number;
  retention: number | null;
  recall_rate: number | null;
  recall_reviews: number;
  pace: number | null;
  cards: number;
  coverage_text: string;
  retention_text: string;
  pace_text: string;
  summary: string;
  history: ReadinessPoint[];
};

export type PathProblem = { slug: string; title: string; difficulty: string; solved: boolean; box: number | null };
export type PathLesson = { slug: string; title: string; minutes: number; href: string; done: boolean };
export type PathDesign = {
  slug: string;
  title: string;
  outline_done: boolean;
  mock_done: boolean;
  outline_href: string;
  mock_href: string;
};
export type PathUnit = {
  number: number;
  id: string;
  title: string;
  why: string;
  level: string;
  status: "done" | "current" | "ahead";
  problems: PathProblem[];
  extra_problems: number;
  lessons: PathLesson[];
  design: PathDesign;
  boss_done: boolean;
  boss_key: string;
  done_items: number;
  total_items: number;
};
export type StudyPath = {
  units: PathUnit[];
  current_unit: number;
  pacing: string;
  interview_date: string | null;
  weeks_left: number | null;
};

export type StudySettings = {
  timezone: string;
  interview_date: string | null;
  reminders_enabled: boolean;
  reminder_time: string;
  reminder_days: number[];
  reminder_email: boolean;
  email_configured: boolean;
};

export type StudySettingsUpdate = Partial<Omit<StudySettings, "email_configured">> & {
  clear_interview_date?: boolean;
};

export type ReminderDelivery = {
  id: string;
  day: string;
  kind: "daily" | "test";
  status: "sent" | "skipped" | "failed";
  reason: "nothing_due" | "no_email" | "provider_error" | "error" | null;
  subject: string;
  task_count: number;
  task_titles: string[];
  error: string | null;
  created_at: string | null;
};

export type ReminderStatus = {
  enabled: boolean;
  email_configured: boolean;
  timezone: string;
  reminder_time: string;
  next_at: string | null;
  service: { last_run_at: string | null; last_status: string | null; interval_minutes: number; healthy: boolean };
  history: ReminderDelivery[];
};

export type DesignOutline = {
  slug: string;
  title: string;
  prompt: string;
  functional_requirements: string[];
  non_functional_requirements: string[];
  constraints: string[];
  outline: string;
  done: boolean;
  note_id: string | null;
};

export type DrillItem = {
  problem_id: string;
  slug: string;
  difficulty: string;
  statement: string;
  example_input: string;
  example_output: string;
  options: string[];
  due: boolean;
};

export type Drill = { items: DrillItem[]; drilled_today: number; families: string[] };

export type DrillAnswer = {
  correct: boolean;
  correct_index: number;
  family: string;
  family_hint: string;
  pattern: string;
  trigger: string;
  summary: string;
  title: string;
  href: string;
  next_due_on: string;
  box: number;
};

export const studyKeys = {
  today: ["study", "today"] as const,
  drill: ["study", "drill", "patterns"] as const,
  reviews: ["study", "reviews"] as const,
  path: ["study", "path"] as const,
  settings: ["study", "settings"] as const,
  reminderStatus: ["study", "settings", "reminders"] as const,
  readiness: ["study", "readiness"] as const,
  memory: ["study", "memory"] as const,
  progress: ["study", "progress"] as const,
  quiz: (scope: string) => ["study", "reviews", scope] as const,
  outline: (slug: string) => ["study", "outline", slug] as const,
};

export const BOX_LABELS: Record<number, string> = { 1: "1 day", 2: "3 days", 3: "7 days", 4: "21 days", 5: "Long term" };

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function useToday(enabled = true) {
  return useQuery({
    queryKey: studyKeys.today,
    queryFn: () => api.get<TodayPlan>(`/api/v1/study/today?tz=${encodeURIComponent(browserTimezone())}`),
    enabled,
    staleTime: 30_000,
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post<TodayPlan>(`/api/v1/study/today/tasks/${encodeURIComponent(taskId)}/toggle`),
    onSuccess: (plan) => {
      queryClient.setQueryData(studyKeys.today, plan);
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.readiness });
    },
  });
}

export function useReviewQueue(scope?: string | null) {
  return useQuery({
    queryKey: scope ? studyKeys.quiz(scope) : studyKeys.reviews,
    queryFn: () => api.get<ReviewQueue>(scope ? `/api/v1/study/reviews?scope=${encodeURIComponent(scope)}` : "/api/v1/study/reviews"),
    staleTime: 0,
  });
}

export function useProgress(enabled = true) {
  return useQuery({
    queryKey: studyKeys.progress,
    queryFn: () => api.get<Progress>("/api/v1/study/progress"),
    enabled,
    staleTime: 30_000,
  });
}

/** Link to a quiz over a scope such as lesson:<slug>, topic:<slug> or category:<slug>. */
export function quizHref(scope: string): string {
  return `/today/review?scope=${encodeURIComponent(scope)}`;
}

export function useMemory(enabled = true) {
  return useQuery({
    queryKey: studyKeys.memory,
    queryFn: () => api.get<Memory>("/api/v1/study/memory"),
    enabled,
    staleTime: 30_000,
  });
}

export function useAnswerCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, choice, confidence, timeMs }: { cardId: string; choice: number; confidence: Confidence; timeMs?: number }) =>
      api.post<AnswerCardResult>(`/api/v1/study/reviews/${cardId}/answer`, { choice, confidence, time_ms: timeMs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
      queryClient.invalidateQueries({ queryKey: studyKeys.readiness });
      queryClient.invalidateQueries({ queryKey: studyKeys.memory });
      queryClient.invalidateQueries({ queryKey: ["learn"] });
    },
  });
}

export function useRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: Rating }) =>
      api.post<RateResult>(`/api/v1/study/reviews/${cardId}/rate`, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.readiness });
    },
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: studyKeys.readiness,
    queryFn: () => api.get<Readiness>("/api/v1/study/readiness"),
    staleTime: 30_000,
  });
}

export function useStudyPath() {
  return useQuery({
    queryKey: studyKeys.path,
    queryFn: () => api.get<StudyPath>("/api/v1/study/path"),
    staleTime: 30_000,
  });
}

export function useTogglePathItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) =>
      api.post<{ item_key: string; done: boolean }>(`/api/v1/study/path/items/${encodeURIComponent(itemKey)}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
    },
  });
}

export function useStudySettings() {
  return useQuery({
    queryKey: studyKeys.settings,
    queryFn: () => api.get<StudySettings>("/api/v1/study/settings"),
  });
}

export function useReminderStatus() {
  return useQuery({
    queryKey: studyKeys.reminderStatus,
    queryFn: () => api.get<ReminderStatus>("/api/v1/study/settings/reminders"),
    staleTime: 15_000,
  });
}

export function useSaveStudySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: StudySettingsUpdate) => api.put<StudySettings>("/api/v1/study/settings", update),
    onSuccess: (settings) => {
      queryClient.setQueryData(studyKeys.settings, settings);
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
      queryClient.invalidateQueries({ queryKey: studyKeys.reminderStatus });
    },
  });
}

export function useOutline(slug: string) {
  return useQuery({
    queryKey: studyKeys.outline(slug),
    queryFn: () => api.get<DesignOutline>(`/api/v1/study/outline/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });
}

export function useSaveOutline(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { outline: string; done?: boolean }) =>
      api.put<DesignOutline>(`/api/v1/study/outline/${encodeURIComponent(slug)}`, payload),
    onSuccess: (outline) => {
      queryClient.setQueryData(studyKeys.outline(slug), outline);
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
      queryClient.invalidateQueries({ queryKey: studyKeys.reviews });
    },
  });
}

export function formatDay(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function nextDueLabel(iso: string, from: string): string {
  const due = new Date(`${iso}T12:00:00`).getTime();
  const today = new Date(`${from}T12:00:00`).getTime();
  const days = Math.round((due - today) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useDrill() {
  return useQuery({
    queryKey: studyKeys.drill,
    queryFn: () => api.get<Drill>("/api/v1/study/drill/patterns"),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useAnswerDrill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ problemId, choice, confidence, timeMs }: { problemId: string; choice: number; confidence: Confidence; timeMs?: number }) =>
      api.post<DrillAnswer>(`/api/v1/study/drill/patterns/${problemId}/answer`, { choice, confidence, time_ms: timeMs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
      queryClient.invalidateQueries({ queryKey: studyKeys.memory });
    },
  });
}
