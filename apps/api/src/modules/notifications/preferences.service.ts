import prisma from "../../lib/prisma";
import type { NotificationChannel } from "@prisma/client";

export async function getForUser(userId: string) {
  return prisma.notificationPreference.findMany({
    where: { userId },
    orderBy: { channel: "asc" },
  });
}

export async function setEnabled(
  userId: string,
  channel: NotificationChannel,
  enabled: boolean
) {
  return prisma.notificationPreference.upsert({
    where: { userId_channel: { userId, channel } },
    update: { enabled },
    create: { userId, channel, enabled },
  });
}
