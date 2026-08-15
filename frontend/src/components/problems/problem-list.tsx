"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { StatusPip } from "@/components/problems/status-pip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/state";
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
        <p className="mt-1 text-sm text-zinc-500">Browse the Java set by difficulty, topic, and your status.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Search title…"
          defaultValue={q}
          aria-label="Search problems"
          onKeyDown={(event) => {
            if (event.key === "Enter") update({ q: event.currentTarget.value.trim() });
          }}
        />
        <select
          className="select-field"
          aria-label="Difficulty"
          value={difficulty}
          onChange={(event) => update({ difficulty: event.target.value })}
        >
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          className="select-field"
          aria-label="Topics"
          value={tag}
          onChange={(event) => update({ tag: event.target.value })}
        >
          <option value="">All tags</option>
          {(tags.data ?? []).map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="select-field"
          aria-label="Status"
          value={status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="">Any status</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="ATTEMPTED">Attempted</option>
          <option value="SOLVED">Solved</option>
        </select>
        <select
          className="select-field"
          aria-label="Sort"
          value={sort}
          onChange={(event) => update({ sort: event.target.value })}
        >
          <option value="title">Title A–Z</option>
          <option value="-title">Title Z–A</option>
          <option value="difficulty">Difficulty</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>{problems.data?.total ?? 0} problems</span>
      </div>

      {problems.isLoading ? <CardSkeleton rows={6} /> : null}
      {problems.isError ? (
        <ErrorState message="Unable to load problems." onRetry={() => problems.refetch()} />
      ) : null}
      {problems.data && items.length === 0 ? (
        <EmptyState title="No problems match those filters." body="Try another search, tag, or status." />
      ) : null}

      {items.length ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-steel-800 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-steel-900 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Problem</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Topics</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-steel-800 transition-colors hover:bg-steel-900">
                    <td className="px-4 py-3">
                      <Link
                        href={`/problems/${item.slug}`}
                        className="font-medium text-zinc-100 underline-offset-4 hover:text-accent-light hover:underline"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={item.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {item.tags.map((tagItem) => tagItem.name).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPip status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <ProblemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      ) : null}

      {items.length ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            Previous
          </Button>
          <span className="text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ProblemCard({ item }: { item: ProblemListItem }) {
  return (
    <Link
      href={`/problems/${item.slug}`}
      className="block rounded-xl border border-steel-800 bg-steel-900/50 p-4 hover:border-steel-600"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium text-zinc-100 underline-offset-4">{item.title}</h2>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="mt-2 text-xs text-zinc-500">{item.tags.map((tag) => tag.name).join(" · ") || "—"}</div>
      <div className="mt-3">
        <StatusPip status={item.status} />
      </div>
    </Link>
  );
}
