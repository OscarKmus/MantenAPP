import prisma from "../../lib/prisma";
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
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}

export async function createNotification(
  userId: string,
  clientId: string | null,
  title: string,
  body: string
) {
  return prisma.notification.create({
    data: { userId, clientId, title, body },
  });
}
