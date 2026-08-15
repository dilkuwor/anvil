import { CategoryView } from "@/components/learn/category-view";

export default async function LearnCategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  return <CategoryView slug={categorySlug} />;
}
