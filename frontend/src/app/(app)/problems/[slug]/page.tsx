import type { Metadata } from "next";

import { CodeWorkspace } from "@/components/editor/code-workspace";
import { fetchPublicJson } from "@/lib/public-api";
import { pageMeta } from "@/lib/seo";

type ProblemSeo = { title: string; slug: string; description: string; difficulty: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const problem = await fetchPublicJson<ProblemSeo>(`/api/v1/problems/${slug}`);
  if (!problem) {
    return pageMeta({
      title: "Coding problem",
      description: "Practice a software engineering interview problem on Anvil.",
      path: `/problems/${slug}`,
    });
  }
  return pageMeta({
    title: problem.title,
    description: problem.description || `${problem.difficulty} coding interview problem: ${problem.title}.`,
    path: `/problems/${problem.slug}`,
  });
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CodeWorkspace slug={slug} />;
}
