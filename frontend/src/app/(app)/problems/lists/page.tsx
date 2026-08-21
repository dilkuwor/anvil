import type { Metadata } from "next";

import { ProblemListsIndex } from "@/components/problems/problem-lists-index";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Problem lists", "/problems/lists");

export default function ProblemListsPage() {
  return <ProblemListsIndex />;
}
