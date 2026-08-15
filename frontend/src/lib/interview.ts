/** Architectural types for a future Mock Interview flow. Not wired to UI or scoring yet. */

export type MockInterviewStatus = "not_started" | "in_progress" | "completed";

export type MockInterviewSession = {
  id: string;
  problem_id: string;
  problem_slug: string;
  problem_title: string;
  difficulty: string;
  duration_seconds: number;
  remaining_seconds: number;
  hints_used: number;
  attempts: number;
  status: MockInterviewStatus;
};

export type InterviewScores = {
  problem_solving: number;
  correctness: number;
  complexity: number;
  code_quality: number;
  overall: number;
};
