import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type Rating = "forgot" | "shaky" | "good";
export type CardKind = "PROBLEM" | "LESSON" | "DESIGN";

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
};

export type ReviewQueue = {
  day: string;
  cards: ReviewCard[];
  due_total: number;
  boxes: Record<string, number>;
};

export type RateResult = {
  card: ReviewCard;
  remaining: number;
  next_due_on: string;
  recall_rate: number | null;
  recall_reviews: number;
};

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

export const studyKeys = {
  today: ["study", "today"] as const,
  reviews: ["study", "reviews"] as const,
  path: ["study", "path"] as const,
  settings: ["study", "settings"] as const,
  readiness: ["study", "readiness"] as const,
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

export function useReviewQueue() {
  return useQuery({
    queryKey: studyKeys.reviews,
    queryFn: () => api.get<ReviewQueue>("/api/v1/study/reviews"),
    staleTime: 0,
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

export function useSaveStudySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: StudySettingsUpdate) => api.put<StudySettings>("/api/v1/study/settings", update),
    onSuccess: (settings) => {
      queryClient.setQueryData(studyKeys.settings, settings);
      queryClient.invalidateQueries({ queryKey: studyKeys.path });
      queryClient.invalidateQueries({ queryKey: studyKeys.today });
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
