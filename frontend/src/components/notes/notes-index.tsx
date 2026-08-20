"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Notebook, Pencil, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { NoteBody } from "@/components/notes/note-body";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import type { Note, NoteSourceType } from "@/lib/notes";
import { displayNoteTitle, sourceLabel } from "@/lib/notes";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn, formatRelative } from "@/lib/utils";

const NOTE_PAPER_KEY = "anvil-note-paper";

const FILTERS: { id: "ALL" | NoteSourceType; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "LESSON", label: "Lessons" },
  { id: "PROBLEM", label: "Problems" },
  { id: "SYSTEM_DESIGN", label: "System Design" },
];

const PAGE_SIZE = 15;

export function NotesIndex() {
  const { signedIn, ready } = useSession();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 text-[13px] leading-5 text-muted-foreground">
            Everything you saved from lessons, problems, and system design.
          </p>
          {signedIn ? (
            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={filter === item.id ? "default" : "secondary"}
                    className="h-7 px-2.5 text-[11px]"
                    onClick={() => {
                      setFilter(item.id);
                      setPage(1);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <span className="hidden h-5 w-px shrink-0 bg-steel-800 sm:block" aria-hidden />
              <div className="relative w-52 max-w-full">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search notes…"
                  className="h-8 pl-8 text-[13px]"
                  aria-label="Search notes"
                />
              </div>
            </div>
          ) : null}
        </div>
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
        <SectionCard className="p-0">
          <div className="hidden md:block">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((note) => (
                  <tr
                    key={note.id}
                    className="cursor-pointer border-t border-steel-800 hover:bg-steel-950/50"
                    onClick={() => setSelected(note)}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="line-clamp-1">{displayNoteTitle(note)}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      <span className="block">{sourceLabel(note.source_type)}</span>
                      <span className="mt-0.5 block max-w-[14rem] truncate text-[12px]">{note.source_title}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {note.kind === "AI_RESPONSE" ? "Saved from AI" : "Manual"}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-muted-foreground">
                      {formatRelative(note.updated_at)}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        className="text-accent hover:text-accent-light"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(note);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-steel-800 md:hidden">
            {paged.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelected(note)}
                className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-steel-950/50"
              >
                <span className="truncate text-sm font-medium">{displayNoteTitle(note)}</span>
                <span className="text-[12px] text-muted-foreground">
                  {sourceLabel(note.source_type)} · {note.kind === "AI_RESPONSE" ? "Saved from AI" : "Manual"} ·{" "}
                  {formatRelative(note.updated_at)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-steel-800 px-3 py-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </SectionCard>
      )}
      {selected ? (
        <NoteDetailOverlay
          key={selected.id}
          note={selected}
          onClose={() => setSelected(null)}
          onUpdated={setSelected}
        />
      ) : null}
      {auth ? <AuthPrompt kind="notes" onClose={() => setAuth(false)} /> : null}
    </div>
  );
}

function NoteDetailOverlay({
  note,
  onClose,
  onUpdated,
}: {
  note: Note;
  onClose: () => void;
  onUpdated: (note: Note) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [paper, setPaper] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(NOTE_PAPER_KEY) === "1";
  });
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/v1/notes/${note.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted.");
      onClose();
    },
    onError: () => toast.error("Unable to delete note."),
  });

  const save = useMutation({
    mutationFn: () => api.patch<Note>(`/api/v1/notes/${note.id}`, { title: title.trim(), body: body.trim() }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note updated.");
      onUpdated(updated);
      setEditing(false);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to save note."),
  });

  function cancelEdit() {
    setTitle(note.title);
    setBody(note.body);
    setEditing(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (editing) {
        event.preventDefault();
        setTitle(note.title);
        setBody(note.body);
        setEditing(false);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, note.body, note.title, onClose]);

  const fieldClass =
    "flex w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm text-input-foreground shadow-sm outline-none placeholder:text-input-placeholder";

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-background/70"
        aria-label="Close note"
        onClick={() => (editing ? cancelEdit() : onClose())}
      />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-detail-title"
        className="relative flex h-[min(90vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-steel-800 bg-steel-900 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-steel-800 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {sourceLabel(note.source_type)}
              {note.kind === "AI_RESPONSE" ? " · Saved from Ask AI" : null}
            </p>
            <h2 id="note-detail-title" className="mt-1.5 text-lg font-semibold tracking-tight">
              {editing ? "Edit note" : displayNoteTitle(note)}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <Link href={note.source_href} className="hover:text-accent">
                {note.source_title} →
              </Link>
              <span aria-hidden className="hidden h-3 w-px bg-steel-700 sm:block" />
              <span>Updated {formatRelative(note.updated_at)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {editing ? null : (
              <button
                type="button"
                aria-pressed={paper}
                aria-label={paper ? "Switch to plain view" : "Switch to paper view"}
                title={paper ? "Plain view" : "Paper view"}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-background hover:text-foreground",
                  paper && "bg-background text-foreground",
                )}
                onClick={() => {
                  setPaper((value) => {
                    const next = !value;
                    window.localStorage.setItem(NOTE_PAPER_KEY, next ? "1" : "0");
                    return next;
                  });
                }}
              >
                <Notebook className="h-4 w-4" aria-hidden />
                Paper
              </button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-coral"
              disabled={remove.isPending || save.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
            {editing ? (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" form="note-edit-form" size="sm" disabled={save.isPending || !body.trim()}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Button>
            )}
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label="Close note"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        {editing ? (
          <form
            id="note-edit-form"
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!body.trim() || save.isPending) return;
              save.mutate();
            }}
          >
            {note.kind === "MANUAL" ? (
              <div className="space-y-1.5">
                <Label htmlFor="note-detail-title-field">Title</Label>
                <Input
                  id="note-detail-title-field"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Title"
                  maxLength={120}
                  autoFocus
                  className="bg-background"
                />
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
              <Label htmlFor="note-detail-body">Note</Label>
              <textarea
                id="note-detail-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                autoFocus={note.kind !== "MANUAL"}
                placeholder="Write your note…"
                className={`${fieldClass} min-h-[16rem] flex-1 resize-y leading-6`}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    if (body.trim() && !save.isPending) save.mutate();
                  }
                }}
              />
            </div>
          </form>
        ) : (
          <div
            className={
              paper
                ? "note-paper min-h-0 flex-1 overflow-y-auto px-5 py-5 pl-14 sm:px-8 sm:pl-16"
                : "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            }
          >
            <NoteBody content={note.body} />
          </div>
        )}
      </article>
    </div>
  );
}
