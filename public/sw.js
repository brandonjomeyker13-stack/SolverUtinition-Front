// Solo notificaciones push: no guarda nada en caché.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(datos.title || "SolverUnition", {
      body: datos.body || "",
      icon: "/icon-192.png",
      badge: "/favicon-32.png",
      data: { url: datos.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.location.origin) && "focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
