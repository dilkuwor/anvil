import type { Metadata } from "next";

import { CategoryView } from "@/components/learn/category-view";
import type { LearningCategoryDetail } from "@/lib/learn";
import { fetchPublicJson } from "@/lib/public-api";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await fetchPublicJson<LearningCategoryDetail>(`/api/v1/learn/categories/${categorySlug}`);
  if (!category) {
    return pageMeta({
      title: "Learn",
      description: "Interview preparation lessons on Anvil.",
      path: `/learn/${categorySlug}`,
    });
  }
  return pageMeta({
    title: category.title,
    description: category.description || `Lessons in ${category.title} for software engineering interviews.`,
    path: `/learn/${category.slug}`,
  });
}

export default async function LearnCategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  return <CategoryView slug={categorySlug} />;
}
