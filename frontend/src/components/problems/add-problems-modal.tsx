"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type ProblemListResponse } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export function AddProblemsModal({
  existingIds,
  busy = false,
  onClose,
  onAdd,
}: {
  existingIds: string[];
  busy?: boolean;
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const existing = useMemo(() => new Set(existingIds), [existingIds]);
  const search = q.trim().length >= 1 ? `?q=${encodeURIComponent(q.trim())}&page_size=30` : "?page_size=30&sort=title";
  const problems = useQuery({
    queryKey: queryKeys.problems({ picker: q }),
    queryFn: () => api.get<ProblemListResponse>(`/api/v1/problems${search}`),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(id: string) {
    if (existing.has(id)) return;
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-steel-800 bg-steel-900 shadow-lg">
        <div className="border-b border-steel-800 p-4">
          <h2 className="text-base font-semibold tracking-tight">Add problems</h2>
          <Input className="mt-3" placeholder="Search problems…" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {problems.data?.items.map((item) => {
            const already = existing.has(item.id);
            const checked = already || selected.includes(item.id);
            return (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] hover:bg-steel-950/50"
              >
                <input type="checkbox" checked={checked} disabled={already} onChange={() => toggle(item.id)} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {already ? <span className="text-[12px] text-muted-foreground">Added</span> : null}
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-steel-800 px-4 py-3">
          <p className="text-[13px] text-muted-foreground">{selected.length} problems selected</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy || selected.length === 0} onClick={() => onAdd(selected)}>
              {busy ? "Adding…" : "Add to list"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
