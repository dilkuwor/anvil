"use client";

import { CloudOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  isOfflineServerSnapshot,
  isOfflineSnapshot,
  registerOfflineWorker,
  subscribeNetwork,
} from "@/lib/offline";

/**
 * Starts the offline worker and shows a calm line when the network is gone.
 *
 * The connectivity state is read straight from the browser and the worker rather than copied into
 * React state, so there is one source of truth and no effect that sets state on mount.
 */
export function OfflineWatch() {
  const offline = useSyncExternalStore(subscribeNetwork, isOfflineSnapshot, isOfflineServerSnapshot);

  useEffect(() => {
    registerOfflineWorker();
  }, []);

  // While offline, follow links with a whole-page load instead of Next.js's usual click-through.
  // A click-through asks the server for the page's data, which cannot be answered and ends on an
  // error screen; a whole-page load is a plain navigation, which the worker answers from its cache.
  useEffect(() => {
    if (!offline) return;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || link.hasAttribute("download") || link.target === "_blank") return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      window.location.assign(url.href);
    }

    // Capture, so this runs before the router's own handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [offline]);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-amber-500/40 bg-amber-500/15 px-4 py-2 text-[13px] text-amber-200 backdrop-blur-sm"
    >
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>Offline — showing saved pages. Anything not saved will come back when you reconnect.</span>
    </div>
  );
}
