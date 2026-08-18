import { Suspense } from "react";

import { PageLoader } from "@/components/ui/state";
import { SimulatorLoader } from "@/system-design/ui/simulator-loader";

export default function SystemDesignSimulatorPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SimulatorLoader />
    </Suspense>
  );
}
