import { TopicView } from "@/components/learn/topic-view";

export default async function LearnTopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  return <TopicView slug={topicSlug} />;
}
