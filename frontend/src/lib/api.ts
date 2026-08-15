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
  if (init.body && !headers.has("Content-Type")) {
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
};

export type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
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
