/*
 * Service worker de MboaDeal : notifications push et page « hors connexion ».
 *
 * Seule la page hors connexion (rendue sans session) et ses fichiers
 * statiques sont mis en cache. Aucune autre page, aucune réponse d'API et
 * aucun message privé n'est conservé : les autres requêtes passent
 * directement par le réseau.
 */

// Nouveau nom à chaque changement de la page hors connexion (ici, nouvelle
// identité MboaDeal) : l'ancien cache est supprimé à l'activation.
const OFFLINE_CACHE = "mboadeal-offline-v1";
const OFFLINE_URL = "/hors-ligne";

async function cacheOfflinePage() {
  const cache = await caches.open(OFFLINE_CACHE);
  // Sans cookies : la page mise en cache ne contient aucune donnée de compte.
  const response = await fetch(OFFLINE_URL, { credentials: "omit", cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  await cache.put(OFFLINE_URL, response);
  await Promise.all(
    assets.map((asset) =>
      fetch(asset, { credentials: "omit" })
        .then((assetResponse) => (assetResponse.ok ? cache.put(asset, assetResponse) : undefined))
        .catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheOfflinePage()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== OFFLINE_CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : toujours le réseau ; la page hors connexion seulement en cas d'échec.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached ?? Response.error();
      }),
    );
    return;
  }

  // Fichiers statiques de la page hors connexion (noms uniques et immuables).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request)) ?? Response.error()),
    );
  }
});

/** Chemin interne sûr (même origine), sinon la page des notifications. */
function safePath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/notifications";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "MboaDeal";
  const body = typeof data.body === "string" ? data.body : "";
  const path = safePath(data.url);
  const tag = typeof data.tag === "string" ? data.tag : undefined;

  event.waitUntil(
    (async () => {
      // Inutile de notifier si la page concernée est déjà ouverte et active.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const alreadyOpen = windows.some(
        (client) => client.focused && new URL(client.url).pathname === path,
      );
      if (alreadyOpen) return;
      await self.registration.showNotification(title, {
        body,
        tag,
        renotify: Boolean(tag),
        lang: "fr",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        data: { path },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(safePath(event.notification.data?.path), self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const exact = windows.find((client) => client.url === url.href);
      if (exact) return exact.focus();
      const sameOrigin = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (sameOrigin) {
        const navigated = await sameOrigin.navigate(url.href).catch(() => null);
        if (navigated) return navigated.focus();
      }
      return self.clients.openWindow(url.href);
    })(),
  );
});
