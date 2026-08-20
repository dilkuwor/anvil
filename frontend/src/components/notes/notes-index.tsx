"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api } from "@/lib/api";
import type { Note, NoteSourceType } from "@/lib/notes";
import { displayNoteTitle, sourceLabel } from "@/lib/notes";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";

const FILTERS: { id: "ALL" | NoteSourceType; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "LESSON", label: "Lessons" },
  { id: "PROBLEM", label: "Problems" },
  { id: "SYSTEM_DESIGN", label: "System Design" },
];

export function NotesIndex() {
  const { signedIn, ready } = useSession();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Note | null>(null);
  const [auth, setAuth] = useState(false);
  const notes = useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => api.get<Note[]>("/api/v1/notes"),
    enabled: signedIn,
  });

  if (!ready || (signedIn && notes.isLoading)) return <CardSkeleton rows={6} />;
  if (notes.isError) {
    return <ErrorState message="Unable to load notes." onRetry={() => notes.refetch()} />;
  }

  const items = (notes.data ?? []).filter((note) => {
    if (filter !== "ALL" && note.source_type !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [displayNoteTitle(note), note.body, note.source_title, sourceLabel(note.source_type)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Notes" description="Everything you saved from lessons, problems, and system design." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "default" : "secondary"}
              className="h-7 px-2.5 text-[11px]"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {signedIn ? (
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes…"
            className="h-8 max-w-xs text-[13px]"
            aria-label="Search notes"
          />
        ) : null}
      </div>
      {!signedIn ? (
        <div className="rounded-2xl border border-dashed border-steel-700 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sign in to create and review notes.</p>
          <Button className="mt-4" size="sm" onClick={() => setAuth(true)}>
            Sign in
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-steel-700 px-5 py-10 text-center text-sm text-muted-foreground">
          {query.trim()
            ? "No notes match that search."
            : filter === "ALL"
              ? "No notes yet."
              : `No ${sourceLabel(filter).toLowerCase()} notes yet.`}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setSelected(note)}
              className="rounded-xl border border-steel-800 bg-background/30 p-3 text-left hover:border-steel-600 hover:bg-steel-950/40"
            >
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {sourceLabel(note.source_type)}
                {note.kind === "AI_RESPONSE" ? " · Saved from Ask AI" : null}
              </p>
              <h3 className="mt-1 truncate text-sm font-medium">{displayNoteTitle(note)}</h3>
              <p className="mt-1 line-clamp-4 text-[13px] leading-5 text-muted-foreground">{note.body}</p>
            </button>
          ))}
        </div>
      )}
      {selected ? <NoteDetailOverlay note={selected} onClose={() => setSelected(null)} /> : null}
      {auth ? <AuthPrompt kind="notes" onClose={() => setAuth(false)} /> : null}
    </div>
  );
}

function NoteDetailOverlay({ note, onClose }: { note: Note; onClose: () => void }) {
  const queryClient = useQueryClient();
  const title = displayNoteTitle(note);
  const remove = useMutation({
    mutationFn: () => api.delete(`/api/v1/notes/${note.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted.");
      onClose();
    },
    onError: () => toast.error("Unable to delete note."),
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Close note" onClick={onClose} />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-detail-title"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-steel-800 bg-steel-900 shadow-lg"
      >
        <header className="flex items-start justify-between gap-3 border-b border-steel-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {sourceLabel(note.source_type)}
              {note.kind === "AI_RESPONSE" ? " · Saved from Ask AI" : null}
            </p>
            <h2 id="note-detail-title" className="mt-1 text-base font-semibold tracking-tight">
              {title}
            </h2>
            <Link href={note.source_href} className="mt-1 inline-block text-[12px] text-muted-foreground hover:text-accent">
              {note.source_title} →
            </Link>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Close note"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/90">{note.body}</p>
        </div>
        <footer className="flex justify-end border-t border-steel-800 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-coral"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </footer>
      </article>
    </div>
  );
}
