import type { Metadata } from "next";

import { TodayView } from "@/components/study/today-view";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Today", "/today");

export default function TodayPage() {
  return <TodayView />;
}
