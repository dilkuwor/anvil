"use client";

import { CloudOff, HardDrive, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import {
  clearOffline,
  emptyNotesJson,
  formatBytes,
  neverChanges,
  offlineSupported,
  offlineUsage,
  savedNotesJson,
  subscribeSaved,
  type SavedNotes,
} from "@/lib/offline";

/**
 * What this browser is holding for offline use, and the one button that lets go of it.
 *
 * Saved pages live in this browser only. They are not on the server and do not follow the account
 * to another machine, so the panel says so rather than letting that be a surprise.
 */
export function OfflineSettings() {
  const [usage, setUsage] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const supported = useSyncExternalStore(neverChanges, offlineSupported, () => false);
  const notesJson = useSyncExternalStore(subscribeSaved, savedNotesJson, emptyNotesJson);
  const entries = useMemo(
    () => Object.entries(JSON.parse(notesJson) as SavedNotes).sort((a, b) => b[1].at - a[1].at),
    [notesJson],
  );

  const readUsage = useCallback(() => {
    // Set after the await, so nothing is written to state while the effect body is running.
    void offlineUsage().then(setUsage);
  }, []);

  useEffect(readUsage, [readUsage, notesJson]);

  async function onClear() {
    setClearing(true);
    try {
      await clearOffline();
      readUsage();
    } finally {
      setClearing(false);
      setConfirming(false);
    }
  }

  return (
    <SectionCard className="p-0">
      <div className="border-b border-steel-800/80 bg-steel-950/30 px-5 py-4">
        <SectionTitle>Offline</SectionTitle>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Pages you save are kept in this browser so they open with no network. Saving happens from the
          &ldquo;Save for offline&rdquo; button on a topic, a category or a problem.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {!supported ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
            Saving pages is not available here. It needs a browser that supports it, and the built
            app rather than the development server.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[13px] text-foreground">
              <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {entries.length === 0 ? (
                <span className="text-muted-foreground">Nothing saved yet.</span>
              ) : (
                <span>
                  {entries.length} section{entries.length === 1 ? "" : "s"} saved
                  {usage != null ? ` · about ${formatBytes(usage)} in use` : ""}
                </span>
              )}
            </div>

            {entries.length > 0 ? (
              <ul className="divide-y divide-steel-800/70 rounded-lg border border-steel-800/80">
                {entries.map(([key, note]) => (
                  <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-foreground">{readableKey(key)}</span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      {note.pages} page{note.pages === 1 ? "" : "s"} · {when(note.at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {supported && entries.length > 0 ? (
        <div className="flex items-center justify-end gap-2 border-t border-steel-800/80 bg-steel-950/40 px-5 py-3.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Remove saved pages
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        tone="danger"
        icon={Trash2}
        title="Remove saved pages?"
        description="They will be gone from this browser until you save them again. Nothing on the server changes, and your progress is untouched."
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={clearing}
        onConfirm={onClear}
        onCancel={() => setConfirming(false)}
      />
      {clearing ? (
        <span className="sr-only" role="status">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Removing saved pages
        </span>
      ) : null}
    </SectionCard>
  );
}

/** "learn-topic:two-pointers" reads as "Topic · two pointers". */
function readableKey(key: string): string {
  const [kind, rest = ""] = key.split(":");
  const name = rest.replace(/-/g, " ");
  const label =
    kind === "learn-topic"
      ? "Topic"
      : kind === "learn-category"
        ? "Category"
        : kind === "problem"
          ? "Problem"
          : kind;
  return name ? `${label} · ${name}` : label;
}

function when(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(at).toLocaleDateString();
}
