import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { CreateActionTypeInput, UpdateActionTypeInput } from "./action-types.schema";

export async function listActionTypes() {
  return prisma.actionType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getActionType(id: string) {
  const actionType = await prisma.actionType.findUnique({ where: { id } });
  if (!actionType) {
    throw createError(404, "Action type not found");
  }
  return actionType;
}

export async function createActionType(input: CreateActionTypeInput) {
  // Check name uniqueness
  const existing = await prisma.actionType.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw createError(409, "Action type with this name already exists");
  }

  return prisma.actionType.create({
    data: {
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
    },
  });
}

export async function updateActionType(id: string, input: UpdateActionTypeInput) {
  const existing = await prisma.actionType.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Action type not found");
  }

  // Check name uniqueness if name is changing
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.actionType.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw createError(409, "Action type with this name already exists");
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.color !== undefined) data.color = input.color;
  if (input.icon !== undefined) data.icon = input.icon;

  return prisma.actionType.update({
    where: { id },
    data,
  });
}

export async function deleteActionType(id: string) {
  const existing = await prisma.actionType.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Action type not found");
  }

  // Check if used by any maintenance items
  const usageCount = await prisma.maintenanceItem.count({
    where: { actionTypeId: id },
  });

  if (usageCount > 0) {
    throw createError(409, "Cannot delete action type that is used by maintenance items");
  }

  await prisma.actionType.delete({ where: { id } });
}
