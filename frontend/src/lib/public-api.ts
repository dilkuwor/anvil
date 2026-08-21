export function apiOrigin(): string {
  const raw = process.env.API_PROXY_TARGET?.trim() || process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:8000";
  return raw.replace(/\/+$/, "");
}

export async function fetchPublicJson<T>(path: string): Promise<T | null> {
  const url = `${apiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type CatalogLesson = { slug: string; title: string };
export type CatalogTopic = { slug: string; title: string; lessons: CatalogLesson[] };
export type CatalogCategory = { slug: string; title: string; topics: CatalogTopic[] };

export type ProblemListResponse = {
  items: { slug: string; title: string }[];
  total: number;
  page: number;
  page_size: number;
};

export type CheatSheetCard = { slug: string; title: string; description: string };
