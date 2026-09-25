import type { Metadata } from "next";

import { ReviewSession } from "@/components/study/review-session";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Review", "/today/review");

export default function ReviewPage() {
  return <ReviewSession />;
}
