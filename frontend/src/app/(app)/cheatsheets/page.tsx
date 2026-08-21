import type { Metadata } from "next";

import { CheatSheetIndex } from "@/components/cheatsheets/cheatsheet-index";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Cheat sheets",
  description: "Quick-reference cheat sheets for coding interviews, system design, and computer science fundamentals.",
  path: "/cheatsheets",
});

export default function CheatSheetsPage() {
  return <CheatSheetIndex />;
}
