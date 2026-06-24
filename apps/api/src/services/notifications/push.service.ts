import webPush from "web-push";
import prisma from "../../lib/prisma";
import { getEnv } from "../../config/env";

let vapidInitialized = false;

export function initVapid() {
  if (vapidInitialized) return;

  const env = getEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not configured — push notifications disabled");
    return;
  }

  webPush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  vapidInitialized = true;
  console.log("[push] VAPID initialized");
}

export async function sendToUser(userId: string, payload: object) {
  if (!vapidInitialized) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payloadStr = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // 410 Gone or 404 — subscription expired/invalid, remove it
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint },
        });
        console.log(`[push] Removed stale subscription: ${sub.endpoint}`);
      } else {
        console.error(`[push] Failed to send to ${sub.endpoint}:`, err);
      }
    }
  }
}

export async function sendAll(payload: object) {
  if (!vapidInitialized) return;

  const subscriptions = await prisma.pushSubscription.findMany();
  const payloadStr = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: sub.endpoint },
        });
      } else {
        console.error(`[push] Failed to send to ${sub.endpoint}:`, err);
      }
    }
  }
}
