/**
 * Talking to the offline worker in `public/sw.js`, and remembering what has been saved.
 *
 * No "use client" here, and deliberately so. This is a plain helper, like the rest of `lib/`:
 * every caller is already a client component, and nothing runs at import time. Marking it as a
 * client boundary makes the bundler hand back proxied exports instead of these functions.
 *
 * The worker owns the copies themselves. This file only sends it instructions and keeps a short
 * note of which sections were saved and when, so a button can read "Saved" without asking the
 * worker to list its whole cache.
 */

const NOTE_KEY = "anvil.offline.saved";

/** `urls` is kept so one section can be forgotten without disturbing the others. */
export type SavedNote = { at: number; pages: number; urls?: string[] };
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

/**
 * Whether pages can be saved here at all. False on a dev server as well as in a browser without
 * workers, so nothing offers a button that could not work. See `registerOfflineWorker` for why
 * development is left out.
 */
export function offlineSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    process.env.NODE_ENV === "production"
  );
}

export function registerOfflineWorker() {
  // Deliberately not `offlineSupported()`, which is false in development: the clean-up below is
  // exactly what development needs to run.
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (process.env.NODE_ENV !== "production") {
    // Never run the worker against a dev server. It serves scripts straight from its cache
    // because a built file's name contains a hash of its contents and so can never go stale --
    // but in development those names are reused as the code behind them changes, so a cached
    // copy would hide every edit. Clear anything a production run left on this address.
    void navigator.serviceWorker
      .getRegistrations()
      .then((all) => Promise.all(all.map((one) => one.unregister())))
      .catch(() => {});
    void caches
      ?.keys?.()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("anvil-")).map((n) => caches.delete(n))))
      .catch(() => {});
    return;
  }

  // `updateViaCache: "none"` keeps the browser from serving a stale copy of the worker itself.
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
    /* Without a worker the app simply needs the network, which is how it behaved before. */
  });
}

export type SaveProgress = { done: number; total: number };

async function ask<T>(
  message: Record<string, unknown>,
  onProgress?: (progress: SaveProgress) => void,
  timeoutMs = 600_000,
): Promise<T> {
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
      // Progress arrives on the same port as the answer, so only the answer ends the wait.
      if (event.data?.type === "anvil-progress") {
        onProgress?.(event.data as SaveProgress);
        return;
      }
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
export async function saveForOffline(
  key: string,
  urls: string[],
  onProgress?: (progress: SaveProgress) => void,
): Promise<SaveResult> {
  const unique = Array.from(new Set([...SHELL_URLS, ...urls]));
  const result = await ask<SaveResult>({ type: "anvil-save", urls: unique }, onProgress);
  if (result.saved > 0) {
    writeNotes({ ...readNotes(), [key]: { at: Date.now(), pages: result.saved, urls: unique } });
    announceSaved();
  }
  return result;
}

/**
 * Which of a section's addresses are safe to forget: the ones no other saved section still needs.
 *
 * Sections overlap. A topic saved on its own holds the same lessons as the category it belongs to,
 * and every section holds the shared session reply. Dropping those with the first removal would
 * quietly empty a section the reader still expects to have, so they are kept until nothing wants
 * them. Pure, and tested, because getting it wrong loses saved content without saying so.
 */
export function urlsToDrop(notes: SavedNotes, key: string): string[] {
  const going = notes[key];
  if (!going) return [];

  const stillNeeded = new Set<string>(SHELL_URLS);
  for (const [other, note] of Object.entries(notes)) {
    if (other === key) continue;
    for (const url of note.urls ?? []) stillNeeded.add(url);
  }
  return (going.urls ?? []).filter((url) => !stillNeeded.has(url));
}

/** Forget one section, leaving anything shared with a still-saved section in place. */
export async function removeOffline(key: string): Promise<void> {
  const notes = readNotes();
  if (!notes[key]) return;

  const drop = urlsToDrop(notes, key);
  if (drop.length > 0) await ask({ type: "anvil-remove", urls: drop });

  const rest = { ...notes };
  delete rest[key];
  writeNotes(rest);
  announceSaved();
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
