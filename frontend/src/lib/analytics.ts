export const AnalyticsEvent = {
  SignUp: "sign_up",
  Login: "login",
  StartPracticing: "start_practicing",
  ProblemStarted: "problem_started",
  ProblemCompleted: "problem_completed",
  LessonStarted: "lesson_started",
  LessonCompleted: "lesson_completed",
  MockInterviewStarted: "mock_interview_started",
  MockInterviewCompleted: "mock_interview_completed",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type AnalyticsEventParams = {
  sign_up: { method?: string };
  login: { method?: string };
  start_practicing: { source?: string };
  problem_started: { problem_slug?: string; difficulty?: string };
  problem_completed: { problem_slug?: string; difficulty?: string; status?: string };
  lesson_started: { lesson_slug?: string; topic_slug?: string };
  lesson_completed: { lesson_slug?: string; topic_slug?: string };
  mock_interview_started: { kind?: string; slug?: string };
  mock_interview_completed: { kind?: string; slug?: string };
};

type GtagFn = {
  (command: "js", date: Date): void;
  (command: "config", targetId: string, config?: Record<string, unknown>): void;
  (command: "event", eventName: string, params?: Record<string, unknown>): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

const rawMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(rawMeasurementId) ? rawMeasurementId : "";

export const isAnalyticsEnabled = Boolean(GA_MEASUREMENT_ID);

function send(...args: unknown[]): void {
  if (!isAnalyticsEnabled || typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...(args as Parameters<GtagFn>));
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

export function trackPageView(url: string): void {
  if (!isAnalyticsEnabled || typeof window === "undefined") return;
  send("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent<E extends AnalyticsEventName>(event: E, params?: AnalyticsEventParams[E]): void {
  if (!isAnalyticsEnabled) return;
  send("event", event, params);
}
