import { describe, expect, it } from "vitest";
import { generateSolutionMarkdown } from "@/lib/download";
import type { ProblemDetail, ProblemSolution } from "@/lib/api";

describe("generateSolutionMarkdown", () => {
  const mockProblem = {
    id: "p1",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    description: "Given an array of integers nums and an integer target...",
    constraints: "2 <= nums.length <= 10^4",
    time_complexity: "O(n)",
    space_complexity: "O(n)",
    starter_code: "class Solution {}",
  } as unknown as ProblemDetail;

  const mockSolution: ProblemSolution = {
    problem_id: "p1",
    summary: "Use a hash map to look up complements in O(1) time.",
    pattern: "Hash Map / Frequency Array",
    trigger: "Need fast lookup for pair complements.",
    approaches: [
      {
        id: "a1",
        solution_id: "s1",
        position: 0,
        name: "One-Pass Hash Table",
        language: "JAVA",
        idea: "Iterate through nums while storing seen values.",
        steps: ["Initialize map", "Check complement", "Put into map"],
        time_complexity: "O(n)",
        time_why: "Single pass through the array.",
        space_complexity: "O(n)",
        space_why: "Map stores at most n elements.",
        is_optimal: true,
        is_alternative: false,
        when_to_use: "Best approach in interviews.",
        code: "public int[] twoSum(int[] nums, int target) { return new int[]{}; }",
      },
    ],
    walkthrough: {
      input: "nums = [2,7,11,15], target = 9",
      columns: ["Step", "Num", "Complement", "Map"],
      rows: [["1", "2", "7", "{2: 0}"]],
      result: "[0, 1]",
    },
    mistakes: [
      {
        name: "Reusing same element",
        wrong: "nums[i] + nums[i] == target",
        right: "i != j check or one-pass check",
      },
    ],
    edge_cases: [
      {
        input: "[3, 3], target = 6",
        expected: "[0, 1]",
        why: "Duplicate numbers forming the target",
      },
    ],
    interview_script: ["Start by explaining the brute force O(n^2) approach."],
    follow_ups: [],
    related: [],
  };

  it("generates markdown containing problem details, idea, code, and complexity", () => {
    const md = generateSolutionMarkdown(mockProblem, mockSolution);

    expect(md).toContain("# Two Sum");
    expect(md).toContain("**Difficulty:** EASY");
    expect(md).toContain("Use a hash map to look up complements");
    expect(md).toContain("One-Pass Hash Table (Optimal)");
    expect(md).toContain("```java");
    expect(md).toContain("public int[] twoSum");
    expect(md).toContain("Reusing same element");
    expect(md).toContain("[3, 3], target = 6");
  });
});
