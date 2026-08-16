"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { AddProblemsModal } from "@/components/problems/add-problems-modal";
import { CreateListModal } from "@/components/problems/create-list-modal";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { ListOverflowMenu } from "@/components/problems/list-overflow-menu";
import { StatusPip } from "@/components/problems/status-pip";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import type { ProblemListDetail } from "@/lib/lists";
import { queryKeys } from "@/lib/queries";

export function ProblemListDetailView({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<"rename" | "description" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.problemList(id),
    queryFn: () => api.get<ProblemListDetail>(`/api/v1/problem-lists/${id}`),
  });

  const update = useMutation({
    mutationFn: (payload: { name?: string; description?: string }) =>
      api.patch<ProblemListDetail>(`/api/v1/problem-lists/${id}`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.problemList(id), { ...list.data, ...data, items: list.data?.items ?? [] });
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      queryClient.invalidateQueries({ queryKey: queryKeys.problemList(id) });
      setEditing(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Unable to update list."),
  });

  const add = useMutation({
    mutationFn: (problem_ids: string[]) => api.post<ProblemListDetail>(`/api/v1/problem-lists/${id}/problems`, { problem_ids }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.problemList(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      setAdding(false);
    },
  });

  const remove = useMutation({
    mutationFn: (problemId: string) => api.delete<ProblemListDetail>(`/api/v1/problem-lists/${id}/problems/${problemId}`),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.problemList(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
    },
  });

  const destroy = useMutation({
    mutationFn: () => api.delete(`/api/v1/problem-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      router.push("/problems/lists");
    },
  });

  const data = list.data;
  const items = useMemo(() => {
    return (data?.items ?? []).filter((item) => {
      if (status === "SOLVED" && item.status !== "SOLVED") return false;
      if (status === "UNSOLVED" && item.status === "SOLVED") return false;
      if (difficulty && item.difficulty !== difficulty) return false;
      return true;
    });
  }, [data, status, difficulty]);

  const nextUnsolved = data?.items.find((item) => item.status !== "SOLVED");

  if (list.isLoading) return <CardSkeleton rows={6} />;
  if (list.isError || !data) return <ErrorState message="Unable to load this list." onRetry={() => list.refetch()} />;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumbs items={[{ href: "/problems", label: "Problems" }, { href: "/problems/lists", label: "My Lists" }, { label: data.name }]} />
        <PageHeader
          title={data.name}
          description={data.description || "Custom problem list."}
          meta={`${data.problem_count} problems · ${data.solved_count} solved · ${data.remaining_count} remaining`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {nextUnsolved ? (
            <Button asChild size="sm">
              <Link href={`/problems/${nextUnsolved.slug}`}>Start Practicing</Link>
            </Button>
          ) : (
            <Button size="sm" disabled>
              All solved
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            Add Problems
          </Button>
        </div>
        <ListOverflowMenu
          onRename={() => setEditing("rename")}
          onEditDescription={() => setEditing("description")}
          onDelete={() => {
            if (window.confirm(`Delete “${data.name}”? Problems themselves are not deleted.`)) {
              destroy.mutate();
            }
          }}
        />
      </div>

      <SectionCard className="p-0">
        <div className="grid gap-2 border-b border-steel-800 p-3 sm:grid-cols-2">
          <select className="select-field" aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="UNSOLVED">Unsolved</option>
            <option value="SOLVED">Solved</option>
          </select>
          <select className="select-field" aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {items.length === 0 ? (
          <EmptyState title="No problems in this view" body="Add problems or change filters." />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="w-[38%] px-4 py-2.5 font-medium">Problem</th>
                    <th className="w-[8.5rem] px-4 py-2.5 font-medium">Difficulty</th>
                    <th className="px-4 py-2.5 font-medium">Topics</th>
                    <th className="w-[9.5rem] px-4 py-2.5 font-medium">Status</th>
                    <th className="w-[7rem] px-4 py-2.5 font-medium">Action</th>
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
                        {item.tags.map((tag) => tag.name).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPip status={item.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          className="text-[12px] text-muted-foreground hover:text-coral"
                          onClick={() => remove.mutate(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-steel-800 p-3">
                  <Link href={`/problems/${item.slug}`} className="text-sm font-medium hover:text-accent">
                    {item.title}
                  </Link>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusPip status={item.status} />
                    <button type="button" className="text-[12px] text-muted-foreground" onClick={() => remove.mutate(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {adding ? (
        <AddProblemsModal
          existingIds={data.problem_ids}
          busy={add.isPending}
          onClose={() => setAdding(false)}
          onAdd={(ids) => add.mutate(ids)}
        />
      ) : null}
      {editing ? (
        <CreateListModal
          title={editing === "rename" ? "Rename list" : "Edit description"}
          initialName={data.name}
          initialDescription={data.description}
          confirmLabel="Save"
          error={formError}
          busy={update.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(name, description) =>
            update.mutate(editing === "rename" ? { name } : { description })
          }
        />
      ) : null}
    </div>
  );
}
