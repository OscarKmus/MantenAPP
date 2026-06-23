import { ref } from "vue";
import api from "@/lib/api";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const isSupported = ref(
    typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
  );
  const isSubscribed = ref(false);
  const permission = ref<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isSupported.value) return null;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("[push] Service worker registered:", registration.scope);
      return registration;
    } catch (err) {
      console.error("[push] SW registration failed:", err);
      return null;
    }
  }

  async function subscribe(): Promise<boolean> {
    if (!isSupported.value || !VAPID_PUBLIC_KEY) return false;

    try {
      // Request permission
      const result = await Notification.requestPermission();
      permission.value = result;

      if (result !== "granted") {
        console.log("[push] Permission denied");
        return false;
      }

      // Register SW
      const registration = await registerServiceWorker();
      if (!registration) return false;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Send to backend
      const subJson = subscription.toJSON();
      await api.post("/push/subscribe", {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys!.p256dh,
          auth: subJson.keys!.auth,
        },
      });

      isSubscribed.value = true;
      console.log("[push] Subscribed successfully");
      return true;
    } catch (err) {
      console.error("[push] Subscribe failed:", err);
      return false;
    }
  }

  async function unsubscribe(): Promise<boolean> {
    if (!isSupported.value) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await api.post("/push/unsubscribe", {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }

      isSubscribed.value = false;
      return true;
    } catch (err) {
      console.error("[push] Unsubscribe failed:", err);
      return false;
    }
  }

  return {
    isSupported,
    isSubscribed,
    permission,
    registerServiceWorker,
    subscribe,
    unsubscribe,
  };
}
