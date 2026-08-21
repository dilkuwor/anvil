import type { Metadata } from "next";

import { LessonView } from "@/components/learn/lesson-view";
import { JsonLd } from "@/components/seo/json-ld";
import type { LearningLessonDetail } from "@/lib/learn";
import { fetchPublicJson } from "@/lib/public-api";
import { absoluteUrl, learningResourceJsonLd, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string; lessonSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, topicSlug, lessonSlug } = await params;
  const lesson = await fetchPublicJson<LearningLessonDetail>(`/api/v1/learn/lessons/${lessonSlug}`);
  if (!lesson) {
    return pageMeta({
      title: "Lesson",
      description: "Interview preparation lesson on Anvil.",
      path: `/learn/${categorySlug}/${topicSlug}/${lessonSlug}`,
    });
  }
  return pageMeta({
    title: lesson.title,
    description: lesson.short_description || `${lesson.title} — ${lesson.topic_title} interview lesson.`,
    path: `/learn/${lesson.category_slug}/${lesson.topic_slug}/${lesson.slug}`,
  });
}

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string; lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;
  const lesson = await fetchPublicJson<LearningLessonDetail>(`/api/v1/learn/lessons/${lessonSlug}`);
  const path = lesson
    ? `/learn/${lesson.category_slug}/${lesson.topic_slug}/${lesson.slug}`
    : null;
  return (
    <>
      {lesson && path ? (
        <>
          <JsonLd
            data={learningResourceJsonLd({
              title: lesson.title,
              description: lesson.short_description,
              url: absoluteUrl(path),
              topicTitle: lesson.topic_title,
              minutes: lesson.estimated_minutes,
            })}
          />
          <p className="sr-only">
            {lesson.title}. {lesson.short_description} {lesson.takeaways.join(" ")}
          </p>
        </>
      ) : null}
      <LessonView slug={lessonSlug} />
    </>
  );
}
