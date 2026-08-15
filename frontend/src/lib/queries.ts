import { api, type ProgressSummary, type ProblemDetail, type ProblemListResponse, type SubmissionDetail, type SubmissionListResponse, type Tag, type User } from "@/lib/api";
import type { ActiveInterviewResponse, InterviewSession } from "@/lib/interview";

export const queryKeys = {
  me: ["me"] as const,
  tags: ["tags"] as const,
  problems: (params: Record<string, string | number | undefined>) => ["problems", params] as const,
  problem: (slug: string) => ["problem", slug] as const,
  submissions: (problemId?: string) => ["submissions", problemId ?? "all"] as const,
  submission: (id: string) => ["submission", id] as const,
  progress: ["progress"] as const,
  activity: (days: number) => ["activity", days] as const,
  interview: (id: string) => ["interview", id] as const,
  activeInterview: (problemId: string) => ["interview-active", problemId] as const,
  learnCategories: ["learn", "categories"] as const,
  learnCategory: (slug: string) => ["learn", "category", slug] as const,
  learnTopic: (slug: string) => ["learn", "topic", slug] as const,
  learnLesson: (slug: string) => ["learn", "lesson", slug] as const,
  learnSearch: (q: string) => ["learn", "search", q] as const,
  learnProgress: ["learn", "progress"] as const,
  learnRoadmap: (key: string) => ["learn", "roadmap", key] as const,
};

export const fetchers = {
  me: () => api.get<User>("/api/v1/auth/me"),
  tags: () => api.get<Tag[]>("/api/v1/tags"),
  problems: (search: string) => api.get<ProblemListResponse>(`/api/v1/problems${search}`),
  problem: (slug: string) => api.get<ProblemDetail>(`/api/v1/problems/${slug}`),
  submissions: (problemId?: string) => {
    const query = problemId ? `?problem_id=${problemId}&page_size=50` : "?page_size=50";
    return api.get<SubmissionListResponse>(`/api/v1/submissions${query}`);
  },
  submission: (id: string) => api.get<SubmissionDetail>(`/api/v1/submissions/${id}`),
  progress: () => api.get<ProgressSummary>("/api/v1/progress"),
  activity: (days: number) => api.get(`/api/v1/activity?days=${days}`),
  interview: (id: string) => api.get<InterviewSession>(`/api/v1/interviews/${id}`),
  activeInterview: (problemId: string) =>
    api.get<ActiveInterviewResponse>(`/api/v1/interviews/active?problem_id=${problemId}`),
};
