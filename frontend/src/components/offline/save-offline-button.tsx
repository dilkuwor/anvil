"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  offlineSupported,
  saveForOffline,
  savedAtServerSnapshot,
  savedAtSnapshot,
  subscribeSaved,
} from "@/lib/offline";

/**
 * "Save for offline" for one section: a topic, a problem, the whole of Learn.
 *
 * The caller passes the addresses to keep, because the page already knows them. That avoids a new
 * endpoint whose only job would be to list what the page is holding anyway.
 */
export function SaveOfflineButton({
  storageKey,
  urls,
  label = "Save for offline",
  className,
  size = "sm",
}: {
  /** Identifies this section, so the button can still read "Saved" on the next visit. */
  storageKey: string;
  /**
   * The addresses to keep. Pass a function when the page does not hold them yet: a category knows
   * its topics but not their lessons, so it looks those up once the button is pressed rather than
   * fetching every lesson list just to render a button.
   */
  urls: string[] | (() => Promise<string[]>);
  label?: string;
  className?: string;
  size?: "sm" | "default";
}) {
  const [busy, setBusy] = useState<"no" | "saving" | "error">("no");
  const [detail, setDetail] = useState<string>("");

  // Read straight from storage. On the server this is 0, so the button renders as unsaved and
  // corrects itself on hydration without an effect.
  const savedAt = useSyncExternalStore(
    subscribeSaved,
    useCallback(() => savedAtSnapshot(storageKey), [storageKey]),
    savedAtServerSnapshot,
  );

  if (!offlineSupported()) return null;

  async function onSave() {
    setBusy("saving");
    setDetail("");
    try {
      const list = typeof urls === "function" ? await urls() : urls;
      const result = await saveForOffline(storageKey, list);
      if (result.saved === 0) {
        setBusy("error");
        setDetail("Nothing could be saved. Check the connection.");
        return;
      }
      setBusy("no");
      setDetail(
        result.failed.length > 0
          ? `Saved ${result.saved}. ${result.failed.length} could not be fetched.`
          : `Saved ${result.saved} page${result.saved === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setBusy("error");
      setDetail(error instanceof Error ? error.message : "Could not save.");
    }
  }

  const saving = busy === "saving";
  const saved = savedAt > 0;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Button
        type="button"
        size={size}
        variant={saved ? "ghost" : "outline"}
        disabled={saving}
        onClick={onSave}
        title={saved ? "Saved in this browser. Press again to refresh it." : undefined}
      >
        {saving ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : saved ? (
          <Check className="mr-1.5 h-3.5 w-3.5 text-teal" aria-hidden />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        )}
        {saving ? "Saving…" : saved ? "Saved" : label}
      </Button>
      {detail ? (
        <span
          role="status"
          className={cn("text-[12px]", busy === "error" ? "text-coral" : "text-muted-foreground")}
        >
          {detail}
        </span>
      ) : null}
    </span>
  );
}
