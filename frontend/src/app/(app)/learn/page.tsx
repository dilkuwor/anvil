import type { Metadata } from "next";

import { LearnIndex } from "@/components/learn/learn-index";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Lessons",
  description:
    "Interview-ready lessons covering data structures, algorithms, system design, Java, computer science fundamentals, and AI/ML.",
  path: "/learn",
});

export default function LearnPage() {
  return <LearnIndex />;
}
