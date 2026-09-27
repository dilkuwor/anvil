import type { Metadata } from "next";
import { Suspense } from "react";

import { ReviewSession } from "@/components/study/review-session";
import { CardSkeleton } from "@/components/ui/state";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Review", "/today/review");

export default function ReviewPage() {
  return (
    <Suspense fallback={<CardSkeleton rows={4} />}>
      <ReviewSession />
    </Suspense>
  );
}
