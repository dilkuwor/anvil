import type { Metadata } from "next";
import { Suspense } from "react";

import { VisualizationsView } from "@/components/visualizations/visualizations-view";
import { PageLoader } from "@/components/ui/state";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Visualizations",
  description:
    "Interactive step-through visualizers for core data structures, algorithms, and distributed system patterns. Inspect invariants, test custom inputs, and learn what to say to the interviewer.",
  path: "/visualizations",
});

export default function VisualizationsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VisualizationsView />
    </Suspense>
  );
}

