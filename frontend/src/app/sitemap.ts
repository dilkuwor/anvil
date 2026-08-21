import type { MetadataRoute } from "next";

import {
  type CatalogCategory,
  type CheatSheetCard,
  type ProblemListResponse,
  fetchPublicJson,
} from "@/lib/public-api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

function entry(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly"): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    entry("/", 1, "weekly"),
    entry("/about", 0.6, "monthly"),
    entry("/privacy", 0.3, "yearly"),
    entry("/terms", 0.3, "yearly"),
    entry("/learn", 0.9),
    entry("/problems", 0.9),
    entry("/cheatsheets", 0.8),
    entry("/system-design", 0.9),
    entry("/system-design/problems", 0.8),
    entry("/system-design/simulator", 0.7),
    entry("/roadmap", 0.8),
  ];

  const catalog = await fetchPublicJson<CatalogCategory[]>("/api/v1/learn/catalog");
  for (const category of catalog ?? []) {
    routes.push(entry(`/learn/${category.slug}`, 0.8));
    for (const topic of category.topics) {
      routes.push(entry(`/learn/${category.slug}/${topic.slug}`, 0.7));
      for (const lesson of topic.lessons) {
        routes.push(entry(`/learn/${category.slug}/${topic.slug}/${lesson.slug}`, 0.65));
      }
    }
  }

  const sheets = await fetchPublicJson<CheatSheetCard[]>("/api/v1/cheatsheets");
  for (const sheet of sheets ?? []) {
    routes.push(entry(`/cheatsheets/${sheet.slug}`, 0.7));
  }

  let page = 1;
  const pageSize = 100;
  while (page < 50) {
    const list = await fetchPublicJson<ProblemListResponse>(`/api/v1/problems?page=${page}&page_size=${pageSize}`);
    if (!list?.items.length) break;
    for (const problem of list.items) {
      routes.push(entry(`/problems/${problem.slug}`, 0.7));
    }
    if (list.items.length < pageSize || page * pageSize >= list.total) break;
    page += 1;
  }

  return routes;
}
