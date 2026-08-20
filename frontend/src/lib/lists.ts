import type { ProblemListItem } from "@/lib/api";

export type ProblemListCard = {
  id: string;
  name: string;
  description: string;
  problem_count: number;
  solved_count: number;
  remaining_count: number;
  percent: number;
  updated_at: string;
  problem_ids: string[];
};

export type ProblemListDetail = ProblemListCard & {
  items: ProblemListItem[];
  created_at: string;
};

export function formatListUpdated(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

export function listRoadmapHref(listId: string): string {
  return `/roadmap?list=${encodeURIComponent(listId)}`;
}
