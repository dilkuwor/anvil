import type { Metadata } from "next";
import { Suspense } from "react";

import { ProblemList } from "@/components/problems/problem-list";
import { PageLoader } from "@/components/ui/state";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Coding problems",
  description:
    "Practice software engineering interview problems in Java. Filter by difficulty and topic, run tests, and track your progress.",
  path: "/problems",
});

export default function ProblemsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProblemList />
    </Suspense>
  );
}
