import type { Metadata } from "next";

import { BehavioralHub } from "@/components/behavioral/behavioral-hub";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Behavioral interview prep",
  description: "Practice STAR stories, browse the behavioral question bank by competency, and run a mock behavioral interview with an AI interviewer.",
  path: "/behavioral",
});

export default function BehavioralPage() {
  return <BehavioralHub />;
}
