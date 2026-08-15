export type LearnStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

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
