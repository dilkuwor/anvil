import { Suspense } from "react";

import { ProblemList } from "@/components/problems/problem-list";

export default function ProblemsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Loading problems…</div>}>
      <ProblemList />
    </Suspense>
  );
}
