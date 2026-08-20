"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Eye, FileText, Loader2, Maximize2, Minimize2, Notebook, Pencil, Search, Trash2, Undo2, X } from "lucide-react";
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
              <div className="flex h-8 items-center rounded-lg border border-steel-800 p-0.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "inline-flex h-7 items-center rounded-md px-2.5 text-[13px]",
                      filter === item.id
                        ? "bg-steel-800 font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setFilter(item.id);
                      setPage(1);
                    }}
                  >
                    {item.label}
                  </button>
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
                    <td className="px-4 py-3 align-top">
                      <NoteSourcePath type={note.source_type} title={note.source_title} />
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
                        aria-label="View note"
                        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(note);
                        }}
                      >
                        <Eye className="h-4 w-4" />
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
                <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                  <NoteSourcePath type={note.source_type} title={note.source_title} />
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{note.kind === "AI_RESPONSE" ? "Saved from AI" : "Manual"}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{formatRelative(note.updated_at)}</span>
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
  const [expanded, setExpanded] = useState(false);
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
    <div className={cn("fixed inset-0 z-[55] flex items-center justify-center", expanded ? "p-0" : "p-3 sm:p-6")}>
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
        className={cn(
          "relative flex w-full flex-col overflow-hidden border border-steel-800 bg-steel-900 shadow-2xl",
          expanded ? "h-dvh max-w-none rounded-none" : "h-[min(90vh,44rem)] max-w-3xl rounded-2xl",
        )}
      >
        <header className="border-b border-steel-800">
          <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              {note.kind === "AI_RESPONSE" ? null : (
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {sourceLabel(note.source_type)}
                </p>
              )}
              <h2
                id="note-detail-title"
                className={note.kind === "AI_RESPONSE" ? "text-lg font-semibold tracking-tight" : "mt-1.5 text-lg font-semibold tracking-tight"}
              >
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
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label="Close note"
              title="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex h-11 w-full items-center gap-1 border-t border-steel-800 px-2 sm:px-3">
            {editing ? null : (
              <button
                type="button"
                aria-pressed={paper}
                aria-label={paper ? "Switch to plain view" : "Switch to paper view"}
                title={paper ? "Paper view" : "Plain view"}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground",
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
                {paper ? <Notebook className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </button>
            )}
            {editing ? (
              <>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="Cancel editing"
                  title="Cancel"
                  onClick={cancelEdit}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  form="note-edit-form"
                  disabled={save.isPending || !body.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                  aria-label={save.isPending ? "Saving" : "Save"}
                  title="Save"
                >
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Edit note"
                title="Edit"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              aria-pressed={expanded}
              aria-label={expanded ? "Exit full width" : "Maximize note"}
              title={expanded ? "Minimize" : "Maximize"}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground",
                expanded && "bg-background text-foreground",
              )}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-coral disabled:opacity-50"
              aria-label="Delete note"
              title="Delete"
              disabled={remove.isPending || save.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

function NoteSourcePath({ type, title }: { type: NoteSourceType; title: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[13px]">
      <span className="shrink-0 text-muted-foreground">{sourceLabel(type)}</span>
      {title ? (
        <>
          <ChevronRight className="h-3 w-3 shrink-0 text-steel-600" aria-hidden />
          <span className="min-w-0 truncate text-foreground">{title}</span>
        </>
      ) : null}
    </span>
  );
}
