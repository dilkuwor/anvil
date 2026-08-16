"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { ProblemListCard } from "@/lib/lists";
import { queryKeys } from "@/lib/queries";

export function AddToListPopover({
  problemId,
  onCreate,
}: {
  problemId: string;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const lists = useQuery({
    queryKey: queryKeys.problemLists,
    queryFn: () => api.get<ProblemListCard[]>("/api/v1/problem-lists"),
    enabled: open,
  });

  const toggle = useMutation({
    mutationFn: async ({ list, add }: { list: ProblemListCard; add: boolean }) => {
      if (add) {
        return api.post(`/api/v1/problem-lists/${list.id}/problems`, { problem_ids: [problemId] });
      }
      return api.delete(`/api/v1/problem-lists/${list.id}/problems/${problemId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.problemLists }),
  });

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="Add to list"
        className="rounded-md p-1 text-muted-foreground hover:bg-steel-800 hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <Bookmark className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-steel-800 bg-steel-900 p-3 shadow-lg">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Add to list</p>
          <div className="mt-2 max-h-48 space-y-1 overflow-auto">
            {lists.isLoading ? <p className="py-3 text-[13px] text-muted-foreground">Loading…</p> : null}
            {lists.data?.length === 0 ? (
              <p className="py-3 text-[13px] text-muted-foreground">No lists yet.</p>
            ) : null}
            {lists.data?.map((list) => {
              const checked = list.problem_ids.includes(problemId);
              return (
                <label key={list.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-[13px] hover:bg-steel-950/50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate({ list, add: !checked })}
                  />
                  <span className="truncate">{list.name}</span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-2 text-[13px] text-accent hover:text-accent-light"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            + Create new list
          </button>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
