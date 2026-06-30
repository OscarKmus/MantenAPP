import argon2 from "argon2";
import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { UserRole } from "@mantenti/types";
import type { CreateUserInput } from "./users.schema";

function sanitizeUser(user: {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return users.map(sanitizeUser);
}

export async function getUserById(
  id: string,
  currentUser: { userId: string; role: UserRole }
) {
  // USER can only get themselves
  if (currentUser.role !== "ADMIN" && currentUser.userId !== id) {
    throw createError(403, "You can only view your own profile");
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw createError(404, "User not found");
  }

  return sanitizeUser(user);
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existing) {
    throw createError(409, "Username already exists");
  }

  const passwordHash = await argon2.hash(input.password);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    },
  });

  return sanitizeUser(user);
}

async function assertNotLastAdmin(userId: string, newRole?: UserRole): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: userId } });

  if (!target) {
    throw createError(404, "User not found");
  }

  // Only matters if removing admin status
  if (target.role !== "ADMIN") return;
  if (newRole === "ADMIN") return;

  // Use transaction to prevent race conditions
  await prisma.$transaction(async (tx) => {
    const adminCount = await tx.user.count({ where: { role: "ADMIN" } });

    if (adminCount <= 1) {
      throw createError(403, "Cannot remove the last admin", "LAST_ADMIN");
    }
  });
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  requesterId: string
) {
  // Prevent self-demotion
  if (userId === requesterId && newRole !== "ADMIN") {
    throw createError(403, "Cannot demote yourself");
  }

  await assertNotLastAdmin(userId, newRole);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  return sanitizeUser(user);
}

export async function deleteUser(userId: string, requesterId: string) {
  // Prevent self-deletion
  if (userId === requesterId) {
    throw createError(403, "Cannot delete yourself");
  }

  await assertNotLastAdmin(userId);

  await prisma.user.delete({ where: { id: userId } });
}
