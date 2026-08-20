import { Suspense } from "react";

import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { PageLoader } from "@/components/ui/state";

export default function RoadmapPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RoadmapView />
    </Suspense>
  );
}
