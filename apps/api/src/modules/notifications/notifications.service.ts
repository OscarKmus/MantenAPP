import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { ListNotificationsQuery } from "./notifications.schema";

export async function listForUser(userId: string, params: ListNotificationsQuery) {
  const { unreadOnly, page, limit } = params;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, unreadCount, total, page, limit };
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const BATCH_SIZE = 1000;
  let totalUpdated = 0;

  for (let i = 0; i < 100; i++) {
    const batch = await prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const result = await prisma.notification.updateMany({
      where: { id: { in: batch.map((n) => n.id) } },
      data: { isRead: true },
    });

    totalUpdated += result.count;

    if (batch.length < BATCH_SIZE) break;
  }

  return totalUpdated;
}

export async function createNotification(
  userId: string,
  clientId: string | null,
  title: string,
  body: string
) {
  if (body.length > 500) {
    throw createError(400, "Notification body must be 500 characters or less");
  }
  if (title.length > 200) {
    throw createError(400, "Notification title must be 200 characters or less");
  }

  return prisma.notification.create({
    data: { userId, clientId, title, body },
  });
}
