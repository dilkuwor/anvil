import { CheatSheetView } from "@/components/cheatsheets/cheatsheet-view";

export default async function CheatSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CheatSheetView slug={slug} />;
}
