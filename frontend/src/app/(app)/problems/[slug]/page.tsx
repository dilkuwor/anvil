import { CodeWorkspace } from "@/components/editor/code-workspace";

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CodeWorkspace slug={slug} />;
}
