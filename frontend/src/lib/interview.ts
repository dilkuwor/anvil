export type InterviewPhase =
  | "INTRO"
  | "UNDERSTANDING"
  | "APPROACH"
  | "CODING"
  | "TESTING"
  | "FOLLOW_UP"
  | "REQUIREMENTS"
  | "CAPACITY"
  | "HIGH_LEVEL"
  | "DEEP_DIVE"
  | "SCALABILITY"
  | "RELIABILITY"
  | "TRADEOFFS"
  | "FEEDBACK";

export type InterviewKind = "CODING" | "SYSTEM_DESIGN";

export type InterviewMessage = {
  id: string;
  role: "INTERVIEWER" | "CANDIDATE";
  content: string;
  created_at: string;
};

export type InterviewScores = {
  understanding: number;
  approach: number;
  coding: number;
  correctness: number;
  complexity: number;
  communication: number;
  reasoning: number;
  follow_up: number;
  overall: number;
};

export type InterviewObjective = {
  tests_passed: number;
  tests_total: number;
  submission_accepted: boolean;
  submissions: number;
  wrong_attempts: number;
  hints_used: number;
  time_taken_seconds: number;
  runtime_ms: number | null;
  memory_kb: number | null;
};

export type InterviewFeedback = {
  overall: number;
  scores: InterviewScores;
  objective: InterviewObjective;
  strengths: string[];
  improvements: string[];
  summary: string;
};

export type InterviewSession = {
  id: string;
  problem_id: string | null;
  problem_title: string;
  problem_slug: string;
  difficulty: string;
  kind?: InterviewKind;
  scenario_slug?: string | null;
  scenario?: SystemDesignScenario | null;
  architecture?: ArchitectureGraph | null;
  phase: InterviewPhase;
  phase_label: string;
  duration_seconds: number;
  remaining_seconds: number;
  hints_used: number;
  run_count: number;
  submit_count: number;
  accepted: boolean;
  wrong_attempts: number;
  last_run_passed: number;
  last_run_total: number;
  last_runtime_ms: number | null;
  last_memory_kb: number | null;
  last_status: string | null;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  messages: InterviewMessage[];
  feedback: InterviewFeedback | null;
};

export type ActiveInterviewResponse = {
  session: InterviewSession | null;
};

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function remainingFromStart(startedAt: string, durationSeconds: number, now = Date.now()): number {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return durationSeconds;
  return Math.max(0, durationSeconds - Math.floor((now - started) / 1000));
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const SCORE_ROWS: { key: keyof InterviewScores; label: string }[] = [
  { key: "understanding", label: "Problem Understanding" },
  { key: "approach", label: "Approach" },
  { key: "coding", label: "Coding" },
  { key: "correctness", label: "Correctness" },
  { key: "complexity", label: "Complexity" },
  { key: "communication", label: "Communication" },
];

export const DESIGN_SCORE_ROWS: { key: keyof InterviewScores; label: string }[] = [
  { key: "understanding", label: "Requirements" },
  { key: "approach", label: "High-Level Design" },
  { key: "coding", label: "Deep Dive" },
  { key: "correctness", label: "Architecture" },
  { key: "complexity", label: "Capacity" },
  { key: "communication", label: "Communication" },
  { key: "reasoning", label: "Trade-offs" },
  { key: "follow_up", label: "Scale & Reliability" },
];

export type DesignNodeType =
  | "client"
  | "cdn"
  | "load_balancer"
  | "api"
  | "service"
  | "cache"
  | "database"
  | "queue"
  | "worker"
  | "search"
  | "storage"
  | "websocket";

export type DesignNode = {
  id: string;
  type: DesignNodeType;
  label: string;
  x: number;
  y: number;
};

export type DesignEdge = {
  id: string;
  from: string;
  to: string;
};

export type ArchitectureGraph = {
  nodes: DesignNode[];
  edges: DesignEdge[];
};

export type ScenarioWorkload = {
  dau: number;
  requests_per_user_day: number;
  read_ratio: number;
  peak_multiplier: number;
};

export type SystemDesignScenario = {
  slug: string;
  title: string;
  difficulty: string;
  summary: string;
  prompt: string;
  functional_requirements: string[];
  non_functional_requirements: string[];
  constraints: string[];
  assumptions: string[];
  learn_slug?: string | null;
  sample_slug?: string | null;
  workload?: ScenarioWorkload | null;
};

export function emptyArchitecture(): ArchitectureGraph {
  return { nodes: [], edges: [] };
}
