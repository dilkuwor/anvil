import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoader } from "@/components/ui/state";
import { SimulatorLoader } from "@/system-design/ui/simulator-loader";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "System design simulator",
  description: "Model load, queues, and capacity for distributed systems while you practice system design interviews.",
  path: "/system-design/simulator",
});

export default function SystemDesignSimulatorPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SimulatorLoader />
    </Suspense>
  );
}
