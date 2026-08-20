"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { Meter } from "@/components/dashboard/meter";
import { PageHeader } from "@/components/layout/page-header";
import { CreateListModal } from "@/components/problems/create-list-modal";
import { ListOverflowMenu } from "@/components/problems/list-overflow-menu";
import { ProblemsTabs } from "@/components/problems/problems-tabs";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, EmptyState, ErrorState, PageLoader } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import { formatListUpdated, listRoadmapHref, type ProblemListCard } from "@/lib/lists";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";

export function ProblemListsIndex() {
  const { signedIn, ready } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [auth, setAuth] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string; mode: "rename" | "description" } | null>(
    null,
  );

  const lists = useQuery({
    queryKey: queryKeys.problemLists,
    queryFn: () => api.get<ProblemListCard[]>("/api/v1/problem-lists"),
    enabled: signedIn,
  });

  const create = useMutation({
    mutationFn: (payload: { name: string; description: string }) => api.post<ProblemListCard>("/api/v1/problem-lists", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      setCreating(false);
      setFormError(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Unable to create list."),
  });

  const update = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name?: string; description?: string }) =>
      api.patch<ProblemListCard>(`/api/v1/problem-lists/${id}`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.problemLists });
      setEditing(null);
      setFormError(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Unable to update list."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/problem-lists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.problemLists }),
  });

  function requestCreate() {
    if (!signedIn) {
      setAuth(true);
      return;
    }
    setFormError(null);
    setCreating(true);
  }

  if (!ready) return <CardSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Problems"
        description="Organize problems into custom lists for focused practice."
        actions={<ProblemsTabs onCreate={requestCreate} />}
      />

      {!signedIn ? (
        <SectionCard className="px-4 py-10 text-center">
          <EmptyState title="Sign in to create lists" body="Custom lists are saved to your account." />
          <Button className="mt-4" size="sm" onClick={() => setAuth(true)}>
            Log in
          </Button>
        </SectionCard>
      ) : lists.isLoading ? (
        <PageLoader variant="inline" />
      ) : lists.isError ? (
        <ErrorState message="Unable to load lists." onRetry={() => lists.refetch()} />
      ) : lists.data?.length === 0 ? (
        <SectionCard className="px-4 py-10 text-center">
          <EmptyState title="No lists yet" body="Create a list to group problems for focused practice." />
        </SectionCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.data?.map((list) => (
            <SectionCard key={list.id} className="flex flex-col overflow-visible p-4">
              <div className="flex items-start gap-2">
                <Link href={`/problems/lists/${list.id}`} className="min-w-0 flex-1 hover:text-accent">
                  <h2 className="text-sm font-semibold tracking-tight">{list.name}</h2>
                  <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                    {list.problem_count} {list.problem_count === 1 ? "problem" : "problems"}
                  </p>
                </Link>
                <ListOverflowMenu
                  onRename={() => setEditing({ id: list.id, name: list.name, description: list.description, mode: "rename" })}
                  onEditDescription={() =>
                    setEditing({ id: list.id, name: list.name, description: list.description, mode: "description" })
                  }
                  onDelete={() => {
                    if (window.confirm(`Delete “${list.name}”? Problems themselves are not deleted.`)) {
                      remove.mutate(list.id);
                    }
                  }}
                />
              </div>
              {list.description ? (
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{list.description}</p>
              ) : null}
              <div className="mt-auto pt-4">
                <Meter value={list.percent} label={`${list.name} solved`} />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] text-muted-foreground">
                    <span className="tabular-nums">
                      {list.solved_count} solved · {list.remaining_count} remaining
                    </span>
                    <span className="mx-1.5 text-steel-700">·</span>
                    <span>{formatListUpdated(list.updated_at)}</span>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={listRoadmapHref(list.id)}>View Road Map</Link>
                  </Button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {creating ? (
        <CreateListModal
          error={formError}
          busy={create.isPending}
          onClose={() => setCreating(false)}
          onSubmit={(name, description) => create.mutate({ name, description })}
        />
      ) : null}
      {editing ? (
        <CreateListModal
          title={editing.mode === "rename" ? "Rename list" : "Edit description"}
          initialName={editing.name}
          initialDescription={editing.description}
          confirmLabel="Save"
          error={formError}
          busy={update.isPending}
          onClose={() => setEditing(null)}
          onSubmit={(name, description) =>
            update.mutate(
              editing.mode === "rename"
                ? { id: editing.id, name }
                : { id: editing.id, description },
            )
          }
        />
      ) : null}
      {auth ? <AuthPrompt kind="lists" onClose={() => setAuth(false)} /> : null}
    </div>
  );
}
