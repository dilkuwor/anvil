import type { Metadata } from "next";

import { PatternDrill } from "@/components/study/pattern-drill";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Pattern drill", "/today/drill");

export default function DrillPage() {
  return <PatternDrill />;
}
