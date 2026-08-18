"use client";

import { useSearchParams } from "next/navigation";

import { DesignWorkspace } from "@/components/system-design/design-workspace";
import { ScenarioPicker } from "@/components/system-design/scenario-picker";

export function InterviewEntry() {
  const search = useSearchParams();
  if (!search.get("id") && !search.get("scenario")) {
    return <ScenarioPicker />;
  }
  return <DesignWorkspace />;
}
