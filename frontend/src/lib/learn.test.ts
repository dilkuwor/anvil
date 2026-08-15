import { describe, expect, it } from "vitest";

import { suggestedLessonQuestions, type LearningLessonDetail } from "@/lib/learn";

const lesson = {
  id: "lesson-1",
  slug: "capacity-estimation",
  title: "Capacity Estimation",
  short_description: "Back-of-the-envelope math.",
  content: "# Capacity Estimation\n\nQPS and storage.",
  takeaways: ["Peak ≠ average."],
  interview_questions: ["How do you estimate QPS?"],
  estimated_minutes: 8,
  status: "IN_PROGRESS",
  category_slug: "system-design",
  category_title: "System Design",
  topic_slug: "capacity-estimation",
  topic_title: "Capacity Estimation",
  previous: null,
  next: null,
  related_problems: [],
} as LearningLessonDetail;

describe("suggestedLessonQuestions", () => {
  it("builds interview-focused prompts from the current lesson", () => {
    const chips = suggestedLessonQuestions(lesson);
    expect(chips.map((item) => item.label)).toEqual([
      "Explain this concept",
      "Quiz me",
      "Interview me",
      "Real-world example",
      "Common mistakes",
    ]);
    expect(chips[0].question).toContain("Capacity Estimation");
    expect(chips[1].question).toMatch(/Quiz me on Capacity Estimation/);
    expect(chips[2].question).toMatch(/Interview me on Capacity Estimation/);
  });
});
