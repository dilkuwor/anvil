import { ProblemListDetailView } from "@/components/problems/problem-list-detail";

export default async function ProblemListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProblemListDetailView id={id} />;
}
