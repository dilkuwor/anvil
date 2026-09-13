import type { Metadata } from "next";
import { Suspense } from "react";

import { BehavioralWorkspace } from "@/components/behavioral/behavioral-workspace";
import { PageLoader } from "@/components/ui/state";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Behavioral interview", "/behavioral/interview");

export default function BehavioralInterviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <BehavioralWorkspace />
    </Suspense>
  );
}
