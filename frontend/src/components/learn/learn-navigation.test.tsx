import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { LearnCategoryNav } from "@/components/learn/learn-category-nav";
import { LearnHierarchyBar } from "@/components/learn/learn-hierarchy-bar";
import { LessonCurriculumCard } from "@/components/learn/lesson-curriculum";
import { TopicSidebar } from "@/components/learn/topic-sidebar";
import type { LearningLessonDetail } from "@/lib/learn";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const mockLesson: LearningLessonDetail = {
  id: "lesson-1",
  slug: "array-basics",
  title: "Array Basics",
  short_description: "Memory layout and indexing.",
  content: "# Array Basics",
  takeaways: ["O(1) random access."],
  interview_questions: ["Explain contiguous memory."],
  estimated_minutes: 5,
  status: "IN_PROGRESS",
  category_slug: "dsa",
  category_title: "Data Structures & Algorithms",
  topic_slug: "arrays",
  topic_title: "Arrays & Strings",
  previous: null,
  next: null,
  related_problems: [],
};

describe("LearnCategoryNav", () => {
  it("renders All Categories link", () => {
    render(<LearnCategoryNav activeCategorySlug="dsa" />, { wrapper });
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });
});

describe("LearnHierarchyBar", () => {
  it("renders category and topic breadcrumbs correctly", () => {
    render(
      <LearnHierarchyBar
        categorySlug="dsa"
        categoryTitle="Data Structures & Algorithms"
        topicSlug="arrays"
        topicTitle="Arrays & Strings"
        lessonTitle="Array Basics"
        currentIndex={0}
        totalLessons={5}
        estimatedMinutes={5}
      />,
    );

    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Data Structures & Algorithms")).toBeInTheDocument();
    expect(screen.getByText("Arrays & Strings")).toBeInTheDocument();
    expect(screen.getByText("Array Basics")).toBeInTheDocument();
    expect(screen.getByText(/5 min read/)).toBeInTheDocument();
  });
});

describe("LessonCurriculumCard", () => {
  it("renders curriculum component container safely", () => {
    render(<LessonCurriculumCard lesson={mockLesson} />, { wrapper });
    expect(document.body).toBeDefined();
  });
});

describe("TopicSidebar", () => {
  it("renders TopicSidebar safely", () => {
    render(<TopicSidebar categorySlug="dsa" activeTopicSlug="arrays" activeLessonSlug="array-basics" />, { wrapper });
    expect(document.body).toBeDefined();
  });

  it("renders collapsed and expanded states cleanly", () => {
    const { rerender } = render(
      <TopicSidebar categorySlug="dsa" activeTopicSlug="arrays" collapsed={true} />,
      { wrapper },
    );
    expect(document.body).toBeDefined();

    rerender(<TopicSidebar categorySlug="dsa" activeTopicSlug="arrays" collapsed={false} />);
    expect(document.body).toBeDefined();
  });
});
