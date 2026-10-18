/*
 * Service worker de Zuvo.
 *
 * Notifications push uniquement : aucune page, réponse d'API ni message privé
 * n'est mis en cache ici.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
  const title = typeof data.title === "string" && data.title ? data.title : "Zuvo";
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
