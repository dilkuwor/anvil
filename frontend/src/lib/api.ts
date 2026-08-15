export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message ?? "Request failed.";
    const code = data?.error?.code ?? "error";
    throw new ApiError(response.status, message, code);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body == null ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body == null ? undefined : JSON.stringify(body) }),
  putFile: <T>(path: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<T>(path, { method: "PUT", body });
  },
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function streamSsePost(
  path: string,
  body: unknown,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.error?.message ?? "Request failed.", data?.error?.code ?? "error");
  }
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { answer?: string };
    const answer = data.answer ?? "";
    if (answer) onDelta(answer);
    return answer;
  }
  if (!response.body) {
    throw new ApiError(502, "AI tutor is temporarily unavailable. Please try again.", "service_unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assembled = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .map((item) => item.replace(/^data:\s?/, ""))
        .join("")
        .trim();
      if (!line) continue;
      let event: { delta?: string; done?: boolean; error?: string };
      try {
        event = JSON.parse(line) as { delta?: string; done?: boolean; error?: string };
      } catch {
        continue;
      }
      if (event.error) {
        throw new ApiError(503, event.error, "service_unavailable");
      }
      if (event.delta) {
        assembled += event.delta;
        onDelta(event.delta);
      }
    }
  }
  return assembled;
}

export type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  country?: string | null;
  display_name?: string | null;
  has_avatar?: boolean;
};

export type UpdateProfileRequest = {
  username: string;
  display_name: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
  country: string;
};

export type Tag = { id: string; name: string; slug: string };

export type ProblemListItem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  tags: Tag[];
  status: string;
};

export type ProblemListResponse = {
  items: ProblemListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type VisibleTest = {
  id: string;
  input: string;
  expected_output: string;
  execution_order: number;
};

export type ProblemDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  constraints: string;
  input_format: string;
  output_format: string;
  explanation: string;
  hints: string[];
  examples: { input: string; output: string; explanation: string }[];
  time_complexity: string;
  space_complexity: string;
  starter_code: string;
  function_signature: Record<string, unknown>;
  time_limit_ms: number;
  memory_limit_kb: number;
  tags: Tag[];
  visible_tests: VisibleTest[];
  status: string;
  created_at: string;
};

export type TestResult = {
  test_case_id: string | null;
  status: string;
  hidden: boolean;
  input: string | null;
  expected_output: string | null;
  actual_output: string | null;
  runtime_ms: number | null;
  error_message: string | null;
};

export type ExecutionResult = {
  submission_id: string | null;
  status: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  passed: number;
  total: number;
  compile_output: string | null;
  test_results: TestResult[];
};

export type SubmissionSummary = {
  id: string;
  problem_id: string;
  problem_title: string;
  problem_slug: string;
  language: string;
  status: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  passed_count: number;
  total_count: number;
  created_at: string;
};

export type SubmissionDetail = SubmissionSummary & {
  source_code: string;
  compile_output: string | null;
  test_results: TestResult[];
};

export type SubmissionListResponse = {
  items: SubmissionSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type ActivityDay = {
  date: string;
  problems_solved: number;
  submissions: number;
  practice_minutes: number;
  runs: number;
};

export type RecentEvent = {
  problem_title: string;
  problem_slug: string;
  difficulty: string;
  status: string;
  submission_status: string;
  created_at: string;
};

export type TopicProgress = {
  name: string;
  slug: string;
  solved: number;
  total: number;
  percent: number;
};

export type RecommendedProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  status: string;
  tags: Tag[];
};

export type ReadinessFactor = {
  key: string;
  label: string;
  percent: number;
};

export type InterviewReadiness = {
  overall: number;
  blurb: string;
  factors: ReadinessFactor[];
  topics: { name: string; slug: string; percent: number }[];
};

export type ProgressSummary = {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  problems_attempted: number;
  problems_attempting: number;
  total_problems: number;
  easy_total: number;
  medium_total: number;
  hard_total: number;
  today_solved: number;
  total_submissions: number;
  accepted_submissions: number;
  current_streak: number;
  longest_streak: number;
  recent_activity: ActivityDay[];
  recent_events: RecentEvent[];
  activity_calendar: ActivityDay[];
  topic_progress: TopicProgress[];
  recommendations: RecommendedProblem[];
  readiness: InterviewReadiness | null;
};
