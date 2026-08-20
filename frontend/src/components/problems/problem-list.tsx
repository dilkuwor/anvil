"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { AddToListPopover } from "@/components/problems/add-to-list-popover";
import { CreateListModal } from "@/components/problems/create-list-modal";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { ProblemsTabs } from "@/components/problems/problems-tabs";
import { StatusPip } from "@/components/problems/status-pip";
import { CatalogStats } from "@/components/problems/catalog-stats";
import { TopicTags } from "@/components/problems/topic-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError, type ProblemListItem, type ProblemListResponse, type ProgressSummary, type Tag } from "@/lib/api";
import type { ProblemListCard } from "@/lib/lists";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";

const PAGE_SIZE = 15;

export function ProblemList() {
  const params = useSearchParams();
  const router = useRouter();
  const { signedIn } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [auth, setAuth] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (payload: { name: string; description: string }) => api.post<ProblemListCard>("/api/v1/problem-lists", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      setCreating(false);
      router.push("/problems/lists");
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Unable to create list."),
  });

  function requestCreate() {
    if (!signedIn) {
      setAuth(true);
      return;
    }
    setFormError(null);
    setCreating(true);
  }
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
    next.set("page_size", String(PAGE_SIZE));
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
  const progress = useQuery({
    queryKey: queryKeys.progress,
    queryFn: () => api.get<ProgressSummary>("/api/v1/progress"),
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

  const filteredTotal = problems.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const items = problems.data?.items ?? [];
  const catalogTotal = progress.data?.total_problems ?? filteredTotal;
  const solved = progress.data?.total_solved ?? 0;
  const remaining = Math.max(catalogTotal - solved, 0);
  const filtered = Boolean(q || difficulty || tag || status);
  const from = items.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = (page - 1) * PAGE_SIZE + items.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Problems"
        description="Java catalog by difficulty, topic, and status."
        meta={<CatalogStats total={catalogTotal} solved={solved} remaining={remaining} />}
        actions={<ProblemsTabs onCreate={requestCreate} />}
      />

      <SectionCard className="p-0">
        <div className="flex flex-col gap-2 border-b border-steel-800 p-3 lg:flex-row lg:items-center">
          <form
            className="relative min-w-[12rem] flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("q");
              update({ q: String(value ?? "").trim() });
            }}
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              key={q}
              defaultValue={q}
              placeholder="Search problems…"
              aria-label="Search problems"
              className="pl-8"
            />
          </form>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:contents">
            <select
              className="select-field w-full lg:!w-[10rem]"
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
              className="select-field w-full lg:!w-[10rem]"
              aria-label="Topics"
              value={tag}
              onChange={(event) => update({ tag: event.target.value })}
            >
              <option value="">All topics</option>
              {(tags.data ?? []).map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="select-field w-full lg:!w-[9.5rem]"
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
              className="select-field w-full lg:!w-[9.5rem]"
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
          {filtered ? (
            <button
              type="button"
              className="self-start text-[12px] text-muted-foreground hover:text-foreground lg:px-1"
              onClick={() => router.push("/problems")}
            >
              Clear
            </button>
          ) : null}
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
              <table className="w-full table-fixed text-left text-[13px]">
                <thead className="bg-steel-950/40 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="w-[36%] px-4 py-2.5 font-medium">Problem</th>
                    <th className="w-[7.5rem] px-4 py-2.5 font-medium">Difficulty</th>
                    <th className="px-4 py-2.5 font-medium">Topics</th>
                    <th className="w-[9rem] px-4 py-2.5 font-medium">Status</th>
                    <th className="w-11 px-2 py-2.5 font-medium"><span className="sr-only">Lists</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="group border-t border-steel-800 hover:bg-steel-950/50">
                      <td className="px-4 py-2.5">
                        <Link href={`/problems/${item.slug}`} title={item.title} className="line-clamp-1 font-medium hover:text-accent">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <DifficultyBadge difficulty={item.difficulty} />
                      </td>
                      <td className="px-4 py-2.5">
                        <TopicTags tags={item.tags} onSelect={(slug) => update({ tag: slug })} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StatusPip status={item.status} />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="flex justify-end opacity-40 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          {signedIn ? (
                            <AddToListPopover problemId={item.id} onCreate={requestCreate} />
                          ) : (
                            <button
                              type="button"
                              aria-label="Add to list"
                              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                              onClick={() => setAuth(true)}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {items.map((item) => (
                <ProblemCard
                  key={item.id}
                  item={item}
                  signedIn={signedIn}
                  onTag={(slug) => update({ tag: slug })}
                  onAdd={() => (signedIn ? undefined : setAuth(true))}
                  onCreate={requestCreate}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-steel-800 px-4 py-2.5">
              <p className="text-[12px] tabular-nums text-muted-foreground">
                Showing {from}–{to} of {filteredTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </Button>
                <span className="min-w-[3.5rem] text-center text-[13px] tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SectionCard>
      {creating ? (
        <CreateListModal
          error={formError}
          busy={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(name, description) => create.mutate({ name, description })}
        />
      ) : null}
      {auth ? <AuthPrompt kind="lists" onClose={() => setAuth(false)} /> : null}
    </div>
  );
}

function ProblemCard({
  item,
  signedIn,
  onTag,
  onAdd,
  onCreate,
}: {
  item: ProblemListItem;
  signedIn: boolean;
  onTag: (slug: string) => void;
  onAdd: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-steel-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/problems/${item.slug}`} className="min-w-0 text-sm font-medium hover:text-accent">
          {item.title}
        </Link>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="mt-2">
        <TopicTags tags={item.tags} onSelect={onTag} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <StatusPip status={item.status} />
        {signedIn ? (
          <AddToListPopover problemId={item.id} onCreate={onCreate} />
        ) : (
          <button type="button" className="text-[12px] text-muted-foreground" onClick={onAdd}>
            Add to list
          </button>
        )}
      </div>
    </div>
  );
}
