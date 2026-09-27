import type { Metadata } from "next";

import { LearnProgress } from "@/components/learn/learn-progress";
import { PageHeader } from "@/components/layout/page-header";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Learning progress", "/learn/progress");

export default function LearnProgressPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Learning progress"
        description="Every lesson in spaced review, with its status and when it comes back."
      />
      <LearnProgress />
    </div>
  );
}
