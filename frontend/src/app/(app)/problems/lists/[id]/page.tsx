import type { Metadata } from "next";

import { ProblemListDetailView } from "@/components/problems/problem-list-detail";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Problem list", "/problems/lists");

export default async function ProblemListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProblemListDetailView id={id} />;
}
