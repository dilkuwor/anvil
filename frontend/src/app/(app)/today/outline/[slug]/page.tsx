import type { Metadata } from "next";

import { OutlineEditor } from "@/components/study/outline-editor";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Design outline", "/today/outline");

export default async function OutlinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OutlineEditor slug={slug} />;
}
