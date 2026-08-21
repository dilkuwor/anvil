import type { Metadata } from "next";

import { CheatSheetView } from "@/components/cheatsheets/cheatsheet-view";
import { fetchPublicJson } from "@/lib/public-api";
import { pageMeta } from "@/lib/seo";

type SheetSeo = { slug: string; title: string; description: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sheet = await fetchPublicJson<SheetSeo>(`/api/v1/cheatsheets/${slug}`);
  if (!sheet) {
    return pageMeta({
      title: "Cheat sheet",
      description: "Interview cheat sheet on Anvil.",
      path: `/cheatsheets/${slug}`,
    });
  }
  return pageMeta({
    title: `${sheet.title} cheat sheet`,
    description: sheet.description || `${sheet.title} interview cheat sheet.`,
    path: `/cheatsheets/${sheet.slug}`,
  });
}

export default async function CheatSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CheatSheetView slug={slug} />;
}
