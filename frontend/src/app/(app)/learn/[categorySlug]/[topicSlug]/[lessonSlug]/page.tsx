import { LessonView } from "@/components/learn/lesson-view";

export default async function LearnLessonPage({ params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;
  return <LessonView slug={lessonSlug} />;
}
