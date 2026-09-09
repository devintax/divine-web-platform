const CACHE_NAME = "dfg-static-v1";
const OFFLINE_ASSETS = [
  "/offline",
  "/manifest.json",
  "/images/dfg-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (!url.pathname.startsWith("/_next/static/") && !url.pathname.startsWith("/icons/") && !url.pathname.startsWith("/images/")) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification(data.title || "Divine Financial Group", {
    body: data.body || "You have a new secure portal notification.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    tag: data.tag || "dfg-notification",
    data: { url: data.url || "/portal" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url || "/portal", self.location.origin);
  const destination = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : new URL("/portal", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url === destination);
      return existing ? existing.focus() : clients.openWindow(destination);
    })
  );
});
