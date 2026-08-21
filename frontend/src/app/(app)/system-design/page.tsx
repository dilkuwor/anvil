import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";
import { SystemDesignHub } from "@/system-design/ui/hub";

export const metadata: Metadata = pageMeta({
  title: "System design",
  description:
    "Practice system design interviews with guided problems, architecture diagrams, and a traffic simulator.",
  path: "/system-design",
});

export default function SystemDesignPage() {
  return <SystemDesignHub />;
}
