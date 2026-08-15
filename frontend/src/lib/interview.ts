export type InterviewPhase =
  | "INTRO"
  | "UNDERSTANDING"
  | "APPROACH"
  | "CODING"
  | "TESTING"
  | "FOLLOW_UP"
  | "FEEDBACK";

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
  problem_id: string;
  problem_title: string;
  problem_slug: string;
  difficulty: string;
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
