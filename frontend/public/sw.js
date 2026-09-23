/*
 * Anvil offline worker.
 *
 * The database lives on another machine, so with no network every page fails. This keeps a copy
 * of what has been read (and of whatever "Save for offline" was pressed on) and serves that copy
 * when the network is gone.
 *
 * Three caches, because the three kinds of request want different rules:
 *   shell  the build's own JS, CSS and fonts. Their names contain a hash, so a name that is in the
 *          cache can never be stale: serve it without asking the network.
 *   pages  rendered pages. Ask the network first so the content is fresh, fall back to the copy.
 *   data   GET replies from the API. Same rule as pages.
 *
 * Anything else - other origins, and every POST, PUT or DELETE - is passed straight through and
 * never stored, so nothing is written to the server from a cache and no reply is kept by mistake.
 */

const VERSION = "anvil-1";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const DATA = `${VERSION}-data`;
const MINE = [SHELL, PAGES, DATA];

self.addEventListener("install", (event) => {
  // Take over straight away rather than waiting for every tab to close.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      // Drop the previous version's caches so an update does not leave old pages behind.
      await Promise.all(names.filter((name) => !MINE.includes(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

/** A request Next.js makes for page data during a click-through, rather than a whole page. */
function isDataNavigation(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

function isBuildAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(?:woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(url.pathname)
  );
}

/** Tell every open tab whether the last attempt at the network worked. */
async function announce(online) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "anvil-network", online });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Only a plain 200 is worth keeping. Redirects and errors would be replayed as-is offline.
    if (response.ok && response.status === 200) {
      await cache.put(request, response.clone());
    }
    announce(true);
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    announce(false);
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isBuildAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA));
    return;
  }

  if (isDataNavigation(request, url)) {
    // Deliberately not answered from a cache. When this fails, Next.js gives up on the
    // click-through and loads the whole page instead, which the branch below can serve.
    event.respondWith(
      fetch(request).catch((error) => {
        announce(false);
        throw error;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES));
  }
});

/**
 * Every script and stylesheet a page names in its own HTML.
 *
 * A saved page is not readable without these. Its JavaScript is loaded in pieces, and a piece that
 * was never fetched while online is not in any cache, so the page would come up and then fall over
 * as soon as it reached for one. Next.js lists them all in the HTML it sends, which is what this
 * reads. The names carry a hash of their contents, so keeping them is always safe.
 */
function assetsIn(html) {
  const found = new Set();
  const pattern = /\/_next\/static\/[A-Za-z0-9._\-/()%[\]@]+/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    // The same paths appear inside escaped JSON further down the page, so drop any trailing slashes.
    const path = match[0].replace(/\\+$/, "");
    if (/\.(?:js|css|woff2?)$/.test(path)) found.add(path);
  }
  return [...found];
}

async function saveAssets(html) {
  const shell = await caches.open(SHELL);
  await Promise.all(
    assetsIn(html).map(async (path) => {
      if (await shell.match(path)) return; // Hashed name already held: it cannot have changed.
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await shell.put(path, response.clone());
      } catch {
        /* One missing asset should not fail the whole save. */
      }
    }),
  );
}

/** Fetch each address and keep it, so it can be read with the network gone. */
async function save(urls) {
  const pages = await caches.open(PAGES);
  const data = await caches.open(DATA);
  let saved = 0;
  const failed = [];

  for (const raw of urls) {
    const url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin) continue;
    const target = url.pathname.startsWith("/api/") ? data : pages;
    try {
      // `reload` skips the browser's own cache, so a save always stores the current version.
      const response = await fetch(url.toString(), { cache: "reload", credentials: "same-origin" });
      if (response.ok && response.status === 200) {
        await target.put(url.toString(), response.clone());
        saved += 1;
        if ((response.headers.get("Content-Type") || "").includes("text/html")) {
          await saveAssets(await response.clone().text());
        }
      } else {
        failed.push(url.pathname);
      }
    } catch {
      failed.push(url.pathname);
    }
  }
  return { saved, failed };
}

async function clear() {
  await Promise.all(MINE.map((name) => caches.delete(name)));
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  // The page opens a MessageChannel per request and waits on its port, so replies cannot be mixed up.
  const port = event.ports && event.ports[0];
  const reply = (payload) => (port ? port.postMessage(payload) : event.source?.postMessage(payload));

  if (message.type === "anvil-save") {
    event.waitUntil(
      save(message.urls || []).then(
        (result) => reply({ type: "anvil-saved", ...result }),
        (error) => reply({ type: "anvil-saved", saved: 0, failed: [], error: String(error) }),
      ),
    );
    return;
  }

  if (message.type === "anvil-clear") {
    event.waitUntil(clear().then(() => reply({ type: "anvil-cleared" })));
    return;
  }

  if (message.type === "anvil-skip-waiting") {
    self.skipWaiting();
  }
});
