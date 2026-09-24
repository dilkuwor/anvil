"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, CloudOff, Download, HardDrive, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { api } from "@/lib/api";
import type { LearningCategoryCard } from "@/lib/learn";
import {
  clearOffline,
  emptyNotesJson,
  formatBytes,
  neverChanges,
  offlineSupported,
  offlineUsage,
  removeOffline,
  saveForOffline,
  savedNotesJson,
  subscribeSaved,
  type SavedNotes,
  type SaveProgress,
} from "@/lib/offline";
import { learnCategoryUrls, problemUrls } from "@/lib/offline-targets";
import { cn } from "@/lib/utils";

type ProblemRow = { slug: string; tags: { slug: string; name: string }[] };

/** One savable thing: a Learn category, every problem, or the problems under one topic. */
type Target = { key: string; label: string; detail: string; urls: () => Promise<string[]> | string[] };

/**
 * Managing what this browser keeps for offline use.
 *
 * Everything savable is listed in one place, so a whole category or a whole topic can be taken
 * offline without first visiting its page. Saved pages live in this browser only: they are not on
 * the server and do not follow the account to another machine, which the panel says out loud.
 */
export function OfflineSettings() {
  const supported = useSyncExternalStore(neverChanges, offlineSupported, () => false);
  const notesJson = useSyncExternalStore(subscribeSaved, savedNotesJson, emptyNotesJson);
  const notes = useMemo(() => JSON.parse(notesJson) as SavedNotes, [notesJson]);

  const [usage, setUsage] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [showTopics, setShowTopics] = useState(false);

  const readUsage = useCallback(() => {
    // Set after the await, so nothing is written to state while the effect body is running.
    void offlineUsage().then(setUsage);
  }, []);
  useEffect(readUsage, [readUsage, notesJson]);

  const categories = useQuery({
    queryKey: ["offline", "learn-categories"],
    queryFn: () => api.get<LearningCategoryCard[]>("/api/v1/learn/categories"),
    enabled: supported,
  });

  const problems = useQuery({
    queryKey: ["offline", "problems"],
    // The list is paged at a hundred, and both pages together give every slug and its topics,
    // which is all that is needed to group them and to know what each group would save.
    queryFn: async () => {
      const pages = await Promise.all(
        [1, 2].map((page) =>
          api.get<{ items: ProblemRow[]; total: number }>(`/api/v1/problems?page_size=100&page=${page}`),
        ),
      );
      return pages.flatMap((page) => page.items);
    },
    enabled: supported,
  });

  const learnTargets: Target[] = (categories.data ?? []).map((category) => ({
    key: `learn-category:${category.slug}`,
    label: category.title,
    detail: `${category.lesson_count} lesson${category.lesson_count === 1 ? "" : "s"}`,
    urls: () => learnCategoryUrls(category.slug),
  }));

  // Memoised so the empty fallback is not a fresh array on every render, which would rebuild the
  // topic grouping below each time.
  const problemData = problems.data;
  const allProblems = useMemo(() => problemData ?? [], [problemData]);

  const everyProblem: Target = {
    key: "problems:all",
    label: "Every problem",
    detail: `${allProblems.length} problems, with their solutions`,
    urls: () => allProblems.flatMap((problem) => problemUrls(problem.slug)),
  };

  const topicTargets: Target[] = useMemo(() => {
    const byTag = new Map<string, { name: string; slugs: string[] }>();
    for (const problem of allProblems) {
      for (const tag of problem.tags) {
        const row = byTag.get(tag.slug) ?? { name: tag.name, slugs: [] };
        row.slugs.push(problem.slug);
        byTag.set(tag.slug, row);
      }
    }
    return [...byTag.entries()]
      .sort((a, b) => b[1].slugs.length - a[1].slugs.length)
      .map(([slug, row]) => ({
        key: `problems:${slug}`,
        label: row.name,
        detail: `${row.slugs.length} problem${row.slugs.length === 1 ? "" : "s"}`,
        urls: () => row.slugs.flatMap(problemUrls),
      }));
  }, [allProblems]);

  const savedCount = Object.keys(notes).length;

  async function onClear() {
    setClearing(true);
    try {
      await clearOffline();
      readUsage();
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  }

  return (
    <SectionCard className="p-0">
      <div className="border-b border-steel-800/80 bg-steel-950/30 px-5 py-4">
        <SectionTitle>Offline</SectionTitle>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Save lessons and problems into this browser so they open with no network. They are kept here
          only, and do not follow your account to another machine.
        </p>
      </div>

      {!supported ? (
        <p className="flex items-center gap-2 px-5 py-5 text-[13px] text-muted-foreground">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
          Saving pages is not available here. It needs a browser that supports it, and the built app
          rather than the development server.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-steel-800/60 px-5 py-3 text-[13px]">
            <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {savedCount === 0 ? (
              <span className="text-muted-foreground">Nothing saved yet.</span>
            ) : (
              <span className="text-foreground">
                {savedCount} saved{usage != null ? ` · about ${formatBytes(usage)} in use` : ""}
              </span>
            )}
          </div>

          <Group title="Lessons" loading={categories.isLoading}>
            {learnTargets.map((target) => (
              <Row key={target.key} target={target} notes={notes} onDone={readUsage} />
            ))}
          </Group>

          <Group title="Problems" loading={problems.isLoading}>
            <Row target={everyProblem} notes={notes} onDone={readUsage} />
            <li className="px-1 py-1">
              <button
                type="button"
                onClick={() => setShowTopics((open) => !open)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-[12.5px] text-muted-foreground hover:text-foreground"
                aria-expanded={showTopics}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform motion-reduce:transition-none", showTopics && "rotate-180")}
                  aria-hidden
                />
                {showTopics ? "Hide topics" : `Or choose from ${topicTargets.length} topics`}
              </button>
            </li>
            {showTopics
              ? topicTargets.map((target) => (
                  <Row key={target.key} target={target} notes={notes} onDone={readUsage} indent />
                ))
              : null}
          </Group>

          {savedCount > 0 ? (
            <div className="flex items-center justify-end border-t border-steel-800/80 bg-steel-950/40 px-5 py-3.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingClear(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Remove everything
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirmingClear}
        tone="danger"
        icon={Trash2}
        title="Remove everything saved?"
        description="All saved lessons and problems go from this browser until you save them again. Nothing on the server changes, and your progress is untouched."
        confirmLabel="Remove all"
        busyLabel="Removing…"
        busy={clearing}
        onConfirm={onClear}
        onCancel={() => setConfirmingClear(false)}
      />
    </SectionCard>
  );
}

function Group({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <div className="border-b border-steel-800/60 px-5 py-4 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          Loading…
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-steel-800/50">{children}</ul>
      )}
    </div>
  );
}

/** One line: what it is, whether it is saved, and the two things you can do to it. */
function Row({
  target,
  notes,
  onDone,
  indent = false,
}: {
  target: Target;
  notes: SavedNotes;
  onDone: () => void;
  indent?: boolean;
}) {
  const [busy, setBusy] = useState<"no" | "saving" | "removing">("no");
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [error, setError] = useState("");

  const note = notes[target.key];
  const saved = Boolean(note);

  async function onSave() {
    setBusy("saving");
    setError("");
    setProgress(null);
    try {
      const urls = await target.urls();
      const result = await saveForOffline(target.key, urls, setProgress);
      if (result.saved === 0) setError("Nothing could be saved. Check the connection.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy("no");
      setProgress(null);
      onDone();
    }
  }

  async function onRemove() {
    setBusy("removing");
    setError("");
    try {
      await removeOffline(target.key);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove.");
    } finally {
      setBusy("no");
      onDone();
    }
  }

  const working = busy !== "no";

  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-2", indent && "pl-4")}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-foreground">{target.label}</span>
        <span className="block text-[12px] text-muted-foreground">
          {error ? (
            <span className="text-coral">{error}</span>
          ) : busy === "saving" && progress ? (
            `Saving ${progress.done} of ${progress.total}…`
          ) : saved ? (
            `Saved · ${note?.pages ?? 0} page${note?.pages === 1 ? "" : "s"}`
          ) : (
            target.detail
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={saved ? "ghost" : "outline"}
          disabled={working}
          onClick={onSave}
          title={saved ? "Saved in this browser. Press again to refresh it." : undefined}
        >
          {busy === "saving" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : saved ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-teal" aria-hidden />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          {busy === "saving" ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
        {saved ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={working}
            onClick={onRemove}
            aria-label={`Remove ${target.label} from this browser`}
            title="Remove from this browser"
          >
            {busy === "removing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        ) : null}
      </span>
    </li>
  );
}
