import type { Metadata } from "next";

import { TopicView } from "@/components/learn/topic-view";
import type { LearningTopicDetail } from "@/lib/learn";
import { fetchPublicJson } from "@/lib/public-api";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, topicSlug } = await params;
  const topic = await fetchPublicJson<LearningTopicDetail>(`/api/v1/learn/topics/${topicSlug}`);
  if (!topic) {
    return pageMeta({
      title: "Lesson topic",
      description: "Interview preparation topic on Anvil.",
      path: `/learn/${categorySlug}/${topicSlug}`,
    });
  }
  return pageMeta({
    title: topic.title,
    description: topic.description || `${topic.title} lessons for ${topic.category_title} interviews.`,
    path: `/learn/${topic.category_slug}/${topic.slug}`,
  });
}

export default async function LearnTopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  return <TopicView slug={topicSlug} />;
}
