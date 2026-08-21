import type { Metadata } from "next";
import { Suspense } from "react";

import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { PageLoader } from "@/components/ui/state";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Interview roadmap",
  description: "A structured interview-prep roadmap covering DSA, system design, and core computer science topics.",
  path: "/roadmap",
});

export default function RoadmapPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RoadmapView />
    </Suspense>
  );
}
