import { api } from "@/lib/api";
import type { LearningCategoryDetail, LearningTopicDetail } from "@/lib/learn";

/**
 * Which addresses make up a savable section.
 *
 * Kept in one place so the button on a page and the list in Settings always save the same thing.
 * Each entry needs both the page itself and the reply behind it: the page is the frame, and the
 * reply is the content, because these views fetch their own data once they are running.
 */

export function problemUrls(slug: string): string[] {
  return [`/problems/${slug}`, `/api/v1/problems/${slug}`, `/api/v1/problems/${slug}/solution`];
}

export function lessonUrls(href: string, slug: string): string[] {
  return [href, `/api/v1/learn/lessons/${slug}`];
}

export function topicUrls(categorySlug: string, topic: LearningTopicDetail): string[] {
  return [
    `/learn/${categorySlug}/${topic.slug}`,
    `/api/v1/learn/topics/${topic.slug}`,
    ...topic.lessons.flatMap((lesson) => lessonUrls(lesson.href, lesson.slug)),
  ];
}

/**
 * Everything under one Learn category.
 *
 * A category knows its topics but not their lessons, so each topic is read first. That is done
 * when a save is asked for, never just to draw a button.
 */
export async function learnCategoryUrls(slug: string): Promise<string[]> {
  const urls = [`/learn/${slug}`, `/api/v1/learn/categories/${slug}`];
  const category = await api.get<LearningCategoryDetail>(`/api/v1/learn/categories/${slug}`).catch(() => null);

  for (const topic of category?.topics ?? []) {
    urls.push(topic.href, `/api/v1/learn/topics/${topic.slug}`);
    const detail = await api.get<LearningTopicDetail>(`/api/v1/learn/topics/${topic.slug}`).catch(() => null);
    for (const lesson of detail?.lessons ?? []) urls.push(...lessonUrls(lesson.href, lesson.slug));
  }
  return urls;
}
