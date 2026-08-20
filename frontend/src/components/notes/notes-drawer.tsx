"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, NotebookPen, Plus, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthPrompt } from "@/components/auth/auth-prompt";
import { NoteBody } from "@/components/notes/note-body";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { Note, NoteContext, NoteCreate, NoteKind } from "@/lib/notes";
import { displayNoteTitle, sourceLabel } from "@/lib/notes";
import { queryKeys } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function NotesButton({ onClick, count }: { onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground"
      aria-label="Open notes"
      title="Notes"
    >
      <span className="relative">
        <StickyNote className="h-4 w-4" />
        {count ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-3.5 rounded-full bg-accent px-1 text-[9px] font-semibold leading-3.5 text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function NotesPanel({
  context,
  match = "source",
}: {
  context: NoteContext;
  match?: "source" | "type";
}) {
  const [open, setOpen] = useState(false);
  const { signedIn } = useSession();
  const sourceKey = match === "type" ? "type" : context.sourceId;
  const notes = useQuery({
    queryKey: queryKeys.notes(context.sourceType, sourceKey),
    queryFn: () => {
      const params = new URLSearchParams({ source_type: context.sourceType });
      if (match === "source") params.set("source_id", context.sourceId);
      return api.get<Note[]>(`/api/v1/notes?${params}`);
    },
    enabled: signedIn && Boolean(context.sourceId),
  });

  return (
    <>
      <NotesButton onClick={() => setOpen(true)} count={notes.data?.length} />
      {open ? <NotesDrawer context={context} notes={notes.data ?? []} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function NotesDrawer({
  context,
  notes,
  onClose,
  showAllLink = true,
}: {
  context: NoteContext;
  notes: Note[];
  onClose: () => void;
  showAllLink?: boolean;
}) {
  const { signedIn } = useSession();
  const [composing, setComposing] = useState(false);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[55]">
      <button type="button" className="absolute inset-0 bg-background/40" aria-label="Close notes" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-steel-800 bg-steel-900 shadow-2xl md:w-[26rem]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-steel-800 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
            <h2 id="notes-drawer-title" className="mt-0.5 truncate text-sm font-semibold tracking-tight">
              {context.sourceTitle}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Close notes"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-2 border-b border-steel-800 px-4 py-2.5">
          <p className="text-[12px] text-muted-foreground">{sourceLabel(context.sourceType)}</p>
          <div className="flex items-center gap-2">
            {showAllLink ? (
              <Link href="/notes" className="text-[12px] text-muted-foreground hover:text-accent">
                All notes
              </Link>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => {
                if (!signedIn) {
                  setAuth(true);
                  return;
                }
                setComposing(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New Note
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {composing ? <NoteEditor context={context} onDone={() => setComposing(false)} /> : null}
          {!signedIn && !composing ? (
            <p className="rounded-xl border border-dashed border-steel-700 px-3 py-6 text-center text-[13px] text-muted-foreground">
              Sign in to save notes on this {sourceLabel(context.sourceType).toLowerCase()}.
            </p>
          ) : null}
          {signedIn && !notes.length && !composing ? (
            <p className="rounded-xl border border-dashed border-steel-700 px-3 py-6 text-center text-[13px] text-muted-foreground">
              No notes yet. Capture something you want to remember.
            </p>
          ) : null}
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
        {auth ? <AuthPrompt kind="notes" onClose={() => setAuth(false)} /> : null}
      </aside>
    </div>
  );
}

function NoteEditor({
  context,
  onDone,
  kind = "MANUAL",
  initialBody = "",
}: {
  context: NoteContext;
  onDone: () => void;
  kind?: NoteKind;
  initialBody?: string;
}) {
  const queryClient = useQueryClient();
  const { signedIn } = useSession();
  const [auth, setAuth] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(initialBody);

  const create = useMutation({
    mutationFn: (payload: NoteCreate) => api.post<Note>("/api/v1/notes", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(context.sourceType, context.sourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      toast.success("Note saved.");
      onDone();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Unable to save note.");
    },
  });

  function submit() {
    if (!signedIn) {
      setAuth(true);
      return;
    }
    const text = body.trim();
    if (!text) return;
    create.mutate({
      source_type: context.sourceType,
      source_id: context.sourceId,
      kind,
      title: title.trim(),
      body: text,
    });
  }

  return (
    <div className="rounded-xl border border-steel-800 bg-background/40 p-3">
      <div className="space-y-1.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          maxLength={120}
          className="h-9 w-full rounded-md border border-input-border bg-background px-3 text-sm text-input-foreground outline-none placeholder:text-input-placeholder"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a note…"
          rows={6}
          className="w-full resize-y rounded-md border border-input-border bg-background px-3 py-2 text-[13px] leading-6 text-input-foreground outline-none placeholder:text-input-placeholder"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-[11px]" onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" size="sm" className="h-7 px-2.5 text-[11px]" disabled={create.isPending || !body.trim()} onClick={submit}>
          {create.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {auth ? <AuthPrompt kind="notes" onClose={() => setAuth(false)} /> : null}
    </div>
  );
}

export function NoteCard({ note, showSource = false }: { note: Note; showSource?: boolean }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.delete(`/api/v1/notes/${note.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted.");
    },
    onError: () => toast.error("Unable to delete note."),
  });

  return (
    <article className="rounded-xl border border-steel-800 bg-background/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showSource ? (
            <Link href={note.source_href} className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-accent">
              {sourceLabel(note.source_type)} · {note.source_title}
            </Link>
          ) : (
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {note.kind === "AI_RESPONSE" ? "Ask AI" : "Note"}
            </p>
          )}
          <h3 className="mt-1 truncate text-sm font-medium">{displayNoteTitle(note)}</h3>
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-coral"
          aria-label="Delete note"
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1.5">
        <NoteBody content={note.body} compact />
      </div>
    </article>
  );
}

export function SaveAiNoteButton({
  context,
  body,
  disabled,
}: {
  context: NoteContext;
  body: string;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { signedIn } = useSession();
  const [auth, setAuth] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api.post<Note>("/api/v1/notes", {
        source_type: context.sourceType,
        source_id: context.sourceId,
        kind: "AI_RESPONSE",
        body,
      } satisfies NoteCreate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes(context.sourceType, context.sourceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      toast.success("Saved to notes.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to save note."),
  });

  const onClick = useCallback(() => {
    if (!signedIn) {
      setAuth(true);
      return;
    }
    if (!body.trim() || disabled) return;
    save.mutate();
  }, [body, disabled, save, signedIn]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground",
          save.isSuccess && "text-accent",
        )}
        aria-label="Save response as a note"
        title="Save as note"
        disabled={disabled || save.isPending || !body.trim()}
        onClick={onClick}
      >
        {save.isSuccess ? <Bookmark className="h-3.5 w-3.5" fill="currentColor" /> : <NotebookPen className="h-3.5 w-3.5" />}
      </button>
      {auth ? <AuthPrompt kind="notes" onClose={() => setAuth(false)} /> : null}
    </>
  );
}
