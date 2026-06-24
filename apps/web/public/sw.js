// Service worker for push notifications
// Minimal footprint — handles push events, notification clicks, and subscription rotation

// Activate new SW immediately on deploy — don't wait for all tabs to close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      if (!event.newSubscription) return;
      const sub = event.newSubscription;
      const subJson = sub.toJSON();
      try {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          }),
        });
        console.log("[push] Resubscribed after subscription change");
      } catch (err) {
        console.error("[push] Resubscribe failed:", err);
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mantenti", body: event.data.text() };
  }

  const title = payload.title || "Mantenti";
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data || {},
    tag: payload.data?.clientId || "default",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.clientId
    ? `/clients/${event.notification.data.clientId}`
    : "/clients";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open (only match /clients paths)
      for (const client of clientList) {
        try {
          const clientPath = new URL(client.url).pathname;
          if ((clientPath === "/clients" || clientPath.startsWith("/clients/")) && "focus" in client) {
            return client.focus();
          }
        } catch {
          // Invalid URL — skip
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
