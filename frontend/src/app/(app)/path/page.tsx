import type { Metadata } from "next";

import { PathView } from "@/components/study/path-view";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Your path", "/path");

export default function PathPage() {
  return <PathView />;
}
