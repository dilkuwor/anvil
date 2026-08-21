import type { Metadata } from "next";
import { Suspense } from "react";

import { InterviewEntry } from "@/components/system-design/interview-entry";
import { PageLoader } from "@/components/ui/state";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("System design interview", "/system-design/interview");

export default function SystemDesignInterviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InterviewEntry />
    </Suspense>
  );
}
