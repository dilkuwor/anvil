import type { Metadata } from "next";

import { noIndexMeta } from "@/lib/seo";
import { HistoryLoader } from "@/system-design/ui/history-loader";

export const metadata: Metadata = noIndexMeta("System design history", "/system-design/history");

export default function SystemDesignHistoryRoute() {
  return <HistoryLoader />;
}
