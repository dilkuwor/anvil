export type LearnStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
/** The one lesson status every screen shows. Checked is earned by the knowledge check; mastered by spaced review. */
export type LearnState = "not_started" | "learning" | "checked" | "mastered";

export type LessonCheck = {
  id: string;
  key: string;
  kind: "choice" | "spot_mistake" | "short_answer";
  prompt: string;
  options: string[];
  section: string;
  concept: string;
  /** Only for short_answer: shown after the learner writes their own answer. */
  model_answer: string | null;
};

export type LessonCheckState = {
  total: number;
  checked: number;
  correct_ids: string[];
  attempted_ids: string[];
};

export type LessonReview = {
  cards: number;
  reviews: number;
  next_due_on: string | null;
  last_reviewed_on: string | null;
  mastered_at: string | null;
};

export type AnswerCheckInput = {
  choice?: number;
  text?: string;
  correct?: boolean;
  confidence: "sure" | "unsure";
  time_ms?: number;
};

export type AnswerCheckResult = {
  check_id: string;
  correct: boolean;
  correct_index: number | null;
  model_answer: string | null;
  explanation: string;
  section: string;
  checked: number;
  total: number;
  just_checked: boolean;
  learn_state: LearnState;
};

export type RelatedProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  status: string;
};

export type LearningCategoryCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  topic_count: number;
  lesson_count: number;
  completed_lessons: number;
};

export type LearningTopicSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  lesson_count: number;
  completed_lessons: number;
  percent: number;
  status: LearnStatus;
  href: string;
};

export type LearningLessonSummary = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  estimated_minutes: number;
  status: LearnStatus;
  learn_state?: LearnState;
  needs_refresh?: boolean;
  href: string;
};

export type LearningCategoryDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
  completed_lessons: number;
  percent: number;
  topics: LearningTopicSummary[];
};

export type LearningTopicDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  category_slug: string;
  category_title: string;
  lesson_count: number;
  completed_lessons: number;
  percent: number;
  status: LearnStatus;
  lessons: LearningLessonSummary[];
  related_problems: RelatedProblem[];
  practice_tag: string | null;
};

export type LearningLessonDetail = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  content: string;
  takeaways: string[];
  interview_questions: string[];
  estimated_minutes: number;
  status: LearnStatus;
  category_slug: string;
  category_title: string;
  topic_slug: string;
  topic_title: string;
  previous: LearningLessonSummary | null;
  next: LearningLessonSummary | null;
  related_problems: RelatedProblem[];
  learn_state?: LearnState;
  needs_refresh?: boolean;
  checks?: LessonCheck[];
  check_state?: LessonCheckState | null;
  review?: LessonReview | null;
};

export type LearningSearchHit = {
  type: "category" | "topic" | "lesson" | "problem";
  title: string;
  subtitle: string;
  href: string;
  difficulty: string | null;
};

export type LearningSearchResponse = {
  query: string;
  items: LearningSearchHit[];
};

export type LearningProgressSummary = {
  completed_lessons: number;
  in_progress_lessons: number;
  total_lessons: number;
  percent: number;
  categories: LearningCategoryCard[];
};

export type TopicAskResponse = {
  topic_slug: string;
  answer: string;
};

export type LessonAskMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LessonAskResponse = {
  lesson_slug: string;
  answer: string;
};

export function suggestedLessonQuestions(lesson: LearningLessonDetail): { label: string; question: string }[] {
  return [
    { label: "Explain this concept", question: `Explain ${lesson.title} like I'm preparing for an interview.` },
    { label: "Quiz me", question: `Quiz me on ${lesson.title}.` },
    { label: "Interview me", question: `Interview me on ${lesson.title}.` },
    { label: "Real-world example", question: `Give me a real-world example of ${lesson.title}.` },
    { label: "Common mistakes", question: `What are the common mistakes with ${lesson.title}?` },
  ];
}

export type RoadmapLearnLink = {
  topic: LearningTopicSummary | null;
  practice_tag: string | null;
  mock_problem_slug: string | null;
};

export function learnStatusLabel(status: LearnStatus | string): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

export function actionLabel(status: LearnStatus | string): string {
  if (status === "COMPLETED") return "Review";
  if (status === "IN_PROGRESS") return "Continue";
  return "Start";
}
