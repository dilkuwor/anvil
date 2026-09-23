"use client";

/**
 * Talking to the offline worker in `public/sw.js`, and remembering what has been saved.
 *
 * The worker owns the copies themselves. This file only sends it instructions and keeps a short
 * note of which sections were saved and when, so a button can read "Saved" without asking the
 * worker to list its whole cache.
 */

const NOTE_KEY = "anvil.offline.saved";

export type SavedNote = { at: number; pages: number };
export type SavedNotes = Record<string, SavedNote>;

/** Browser storage throws in private windows and when site data is blocked, so never let it escape. */
function readNotes(): SavedNotes {
  try {
    const raw = window.localStorage.getItem(NOTE_KEY);
    return raw ? (JSON.parse(raw) as SavedNotes) : {};
  } catch {
    return {};
  }
}

function writeNotes(notes: SavedNotes) {
  try {
    window.localStorage.setItem(NOTE_KEY, JSON.stringify(notes));
  } catch {
    /* Saving still worked; only the note is lost. */
  }
}

export function savedNotes(): SavedNotes {
  return readNotes();
}

export function savedNote(key: string): SavedNote | null {
  return readNotes()[key] ?? null;
}

export function offlineSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export function registerOfflineWorker() {
  if (!offlineSupported()) return;
  // `updateViaCache: "none"` keeps the browser from serving a stale copy of the worker itself.
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
    /* Without a worker the app simply needs the network, which is how it behaved before. */
  });
}

async function ask<T>(message: Record<string, unknown>, timeoutMs = 120_000): Promise<T> {
  if (!offlineSupported()) throw new Error("This browser cannot save pages for offline use.");
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error("The offline helper is still starting. Try again in a moment.");

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Saving took too long. Check the connection and try again."));
    }, timeoutMs);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(event.data as T);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

export type SaveResult = { saved: number; failed: string[]; error?: string };

/**
 * Every page is drawn inside the app frame, and the frame asks who is signed in before it draws
 * anything. Saving that reply too means a saved page opens as itself offline instead of as a
 * signed-out shell. It is this browser's own session, which the worker would cache on any online
 * visit anyway.
 */
const SHELL_URLS = ["/api/v1/auth/me"];

/** Fetch and keep every address, then note the section as saved. */
export async function saveForOffline(key: string, urls: string[]): Promise<SaveResult> {
  const unique = Array.from(new Set([...SHELL_URLS, ...urls]));
  const result = await ask<SaveResult>({ type: "anvil-save", urls: unique });
  if (result.saved > 0) {
    writeNotes({ ...readNotes(), [key]: { at: Date.now(), pages: result.saved } });
    announceSaved();
  }
  return result;
}

export async function clearOffline(): Promise<void> {
  await ask({ type: "anvil-clear" });
  writeNotes({});
  announceSaved();
}

/** Roughly how much room the saved pages take, as the browser reports it. */
export async function offlineUsage(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return typeof estimate?.usage === "number" ? estimate.usage : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------------------------
 * Two small stores, so components can read this with `useSyncExternalStore` instead of copying
 * browser state into React state inside an effect.
 * ------------------------------------------------------------------------------------------- */

let offlineNow = false;
const networkListeners = new Set<() => void>();
let networkWired = false;

function setOfflineNow(value: boolean) {
  if (offlineNow === value) return;
  offlineNow = value;
  for (const listener of networkListeners) listener();
}

function wireNetwork() {
  if (networkWired) return;
  networkWired = true;
  // The browser saying "no network" is always right. It saying "network" may not be: a laptop on
  // WiFi with nothing behind it still reports that it is online, which is why the worker's own
  // failed requests are trusted over this.
  window.addEventListener("offline", () => setOfflineNow(true));
  window.addEventListener("online", () => setOfflineNow(false));
  navigator.serviceWorker?.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === "anvil-network") setOfflineNow(!event.data.online);
  });
  if (typeof navigator.onLine === "boolean") offlineNow = !navigator.onLine;
}

export function subscribeNetwork(onChange: () => void): () => void {
  wireNetwork();
  networkListeners.add(onChange);
  return () => networkListeners.delete(onChange);
}

export function isOfflineSnapshot(): boolean {
  return offlineNow;
}

/** Rendering on the server, there is no browser to ask, so never claim to be offline. */
export function isOfflineServerSnapshot(): boolean {
  return false;
}

const savedListeners = new Set<() => void>();
let savedJson: string | null = null;

function announceSaved() {
  savedJson = null;
  for (const listener of savedListeners) listener();
}

/**
 * The saved sections as JSON. Strings compare by value, so an unchanged store keeps handing back
 * an equal snapshot, which is what `useSyncExternalStore` needs to stop re-rendering. It also
 * gives a component a real dependency to rebuild its list from.
 */
export function savedNotesJson(): string {
  if (savedJson === null) savedJson = JSON.stringify(readNotes());
  return savedJson;
}

export function emptyNotesJson(): string {
  return "{}";
}

/** For values that never change after load, such as whether this browser supports any of this. */
export function neverChanges(): () => void {
  return () => {};
}

export function subscribeSaved(onChange: () => void): () => void {
  savedListeners.add(onChange);
  return () => savedListeners.delete(onChange);
}

/**
 * When a section was saved, as a plain number so repeated reads compare equal. Returning a fresh
 * object here would make `useSyncExternalStore` re-render forever.
 */
export function savedAtSnapshot(key: string): number {
  return readNotes()[key]?.at ?? 0;
}

export function savedAtServerSnapshot(): number {
  return 0;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
