"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { StatusPip } from "@/components/problems/status-pip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, type ProblemListItem, type ProblemListResponse, type Tag } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export function ProblemList() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const tag = params.get("tag") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "title";
  const page = Number(params.get("page") ?? "1");

  const search = useMemo(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (difficulty) next.set("difficulty", difficulty);
    if (tag) next.set("tag", tag);
    if (status) next.set("status", status);
    if (sort) next.set("sort", sort);
    next.set("page", String(page));
    next.set("page_size", "15");
    return `?${next.toString()}`;
  }, [q, difficulty, tag, status, sort, page]);

  const problems = useQuery({
    queryKey: queryKeys.problems({ q, difficulty, tag, status, sort, page }),
    queryFn: () => api.get<ProblemListResponse>(`/api/v1/problems${search}`),
  });
  const tags = useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => api.get<Tag[]>("/api/v1/tags"),
  });

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    if (!("page" in next)) merged.set("page", "1");
    router.push(`/problems?${merged.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil((problems.data?.total ?? 0) / 15));
  const items = problems.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Problems</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Java catalog by difficulty, topic, and status.</p>
        </div>
        <p className="text-[13px] tabular-nums text-muted-foreground">{problems.data?.total ?? 0} problems</p>
      </div>

      <SectionCard className="p-0">
        <div className="grid gap-2 border-b border-steel-800 p-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Search title…"
            defaultValue={q}
            aria-label="Search problems"
            onKeyDown={(event) => {
              if (event.key === "Enter") update({ q: event.currentTarget.value.trim() });
            }}
          />
          <select className="select-field" aria-label="Difficulty" value={difficulty} onChange={(event) => update({ difficulty: event.target.value })}>
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <select className="select-field" aria-label="Topics" value={tag} onChange={(event) => update({ tag: event.target.value })}>
            <option value="">All tags</option>
            {(tags.data ?? []).map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <select className="select-field" aria-label="Status" value={status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">Any status</option>
            <option value="NOT_STARTED">Not started</option>
            <option value="ATTEMPTED">Attempted</option>
            <option value="SOLVED">Solved</option>
          </select>
          <select className="select-field" aria-label="Sort" value={sort} onChange={(event) => update({ sort: event.target.value })}>
            <option value="title">Title A–Z</option>
            <option value="-title">Title Z–A</option>
            <option value="difficulty">Difficulty</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {problems.isLoading ? (
          <div className="p-4">
            <CardSkeleton rows={6} />
          </div>
        ) : null}
        {problems.isError ? (
          <div className="p-4">
            <ErrorState message="Unable to load problems." onRetry={() => problems.refetch()} />
          </div>
        ) : null}
        {problems.data && items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No problems match those filters.</p>
        ) : null}

        {items.length ? (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Problem</th>
                    <th className="px-4 py-2.5 font-medium">Difficulty</th>
                    <th className="px-4 py-2.5 font-medium">Topics</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-steel-800 hover:bg-steel-950/50">
                      <td className="px-4 py-2.5">
                        <Link href={`/problems/${item.slug}`} className="font-medium hover:text-accent">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <DifficultyBadge difficulty={item.difficulty} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {item.tags.map((tagItem) => tagItem.name).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPip status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {items.map((item) => (
                <ProblemCard key={item.id} item={item} />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-steel-800 px-3 py-2.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                Previous
              </Button>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
                Next
              </Button>
            </div>
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}

function ProblemCard({ item }: { item: ProblemListItem }) {
  return (
    <Link href={`/problems/${item.slug}`} className="block rounded-xl border border-steel-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium">{item.title}</h2>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="mt-1.5 text-[12px] text-muted-foreground">{item.tags.map((tag) => tag.name).join(" · ") || "—"}</div>
      <div className="mt-2">
        <StatusPip status={item.status} />
      </div>
    </Link>
  );
}
