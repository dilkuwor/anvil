import { Suspense } from "react";

import { DesignWorkspace } from "@/components/system-design/design-workspace";
import { PageLoader } from "@/components/ui/state";

export default function SystemDesignInterviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DesignWorkspace />
    </Suspense>
  );
}
