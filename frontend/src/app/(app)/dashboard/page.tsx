import type { Metadata } from "next";

import { ProgressBoard } from "@/components/dashboard/progress-board";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Dashboard", "/dashboard");

export default function DashboardPage() {
  return <ProgressBoard />;
}
