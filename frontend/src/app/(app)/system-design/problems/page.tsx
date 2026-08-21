import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";
import { ProblemsLoader } from "@/system-design/ui/problems-loader";

export const metadata: Metadata = pageMeta({
  title: "System design problems",
  description: "A catalog of system design interview problems: URL shortener, news feed, chat, video streaming, and more.",
  path: "/system-design/problems",
});

export default function SystemDesignProblemsRoute() {
  return <ProblemsLoader />;
}
