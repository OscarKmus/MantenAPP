import cron from "node-cron";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { withAdvisoryLock } from "../../lib/lock";
import { createNotification } from "../../modules/notifications/notifications.service";
import { sendToUser } from "./push.service";

// 8-byte lock key: "NOTIFYING" in ASCII hex
const NOTIFYING_KEY = BigInt("0x6E4E5446494E475249");

interface ReminderWindow {
  label: string;
  daysBefore: number;
  bodySuffix: string;
}

const WINDOWS: ReminderWindow[] = [
  { label: "3d", daysBefore: 3, bodySuffix: "maintenance in 3 days" },
  { label: "1d", daysBefore: 1, bodySuffix: "maintenance tomorrow" },
  { label: "0d", daysBefore: 0, bodySuffix: "maintenance today" },
];

export function startCron() {
  // Run daily at 09:00 UTC
  cron.schedule("0 9 * * *", async () => {
    logger.info("[cron] Running reminder check");

    try {
      await runReminders();
    } catch (err) {
      logger.error({ err }, "[cron] Error running reminders");
    }
  });

  logger.info("[cron] Scheduled daily reminders at 09:00 UTC");
}

export async function runReminders() {
  return await withAdvisoryLock(NOTIFYING_KEY, async () => {
    logger.info("[cron] Acquired advisory lock, running reminders");

    const now = new Date();

    // Get all users (technicians)
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    if (users.length === 0) {
      logger.info("[cron] No users found, skipping");
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const window of WINDOWS) {
      // Calculate the target date for this window
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + window.daysBefore);

      // Normalize to start of day UTC
      const dayStart = new Date(
        Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate())
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      // Find clients with nextMaintenanceAt in this window
      const clients = await prisma.client.findMany({
        where: {
          nextMaintenanceAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        select: { id: true, name: true },
      });

      if (clients.length === 0) continue;

      for (const client of clients) {
        const body = `${client.name} ${window.bodySuffix}`;

        // Dedup: check if a notification with similar body was created in the last 24h
        const cutoff = new Date(now);
        cutoff.setHours(cutoff.getHours() - 24);

        for (const user of users) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              clientId: client.id,
              body,
              createdAt: { gte: cutoff },
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Create notification
          await createNotification(user.id, client.id, "Upcoming Maintenance", body);
          created++;

          // Send push notification
          try {
            await sendToUser(user.id, {
              title: "Upcoming Maintenance",
              body,
              data: { clientId: client.id },
            });
          } catch {
            // Push failure is non-fatal; in-app notification already created
          }
        }
      }
    }

    logger.info({ created, skipped }, "[cron] Done");
  });
}
