import { Suspense } from "react";

import { ProblemList } from "@/components/problems/problem-list";
import { PageLoader } from "@/components/ui/state";

export default function ProblemsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProblemList />
    </Suspense>
  );
}
