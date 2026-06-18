import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { CreateComponentInput, UpdateComponentInput } from "./equipment-components.schema";

export async function listComponents(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) {
    throw createError(404, "Equipment not found");
  }

  return prisma.equipmentComponent.findMany({
    where: { equipmentId },
    orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
  });
}

export async function getComponent(id: string) {
  const component = await prisma.equipmentComponent.findUnique({ where: { id } });
  if (!component) {
    throw createError(404, "Component not found");
  }
  return component;
}

export async function createComponent(equipmentId: string, input: CreateComponentInput) {
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) {
    throw createError(404, "Equipment not found");
  }

  return prisma.equipmentComponent.create({
    data: {
      equipmentId,
      type: input.type,
      name: input.name,
      specs: input.specs ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateComponent(id: string, input: UpdateComponentInput) {
  const existing = await prisma.equipmentComponent.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Component not found");
  }

  const data: Record<string, unknown> = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.name !== undefined) data.name = input.name;
  if (input.specs !== undefined) data.specs = input.specs;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.equipmentComponent.update({
    where: { id },
    data,
  });
}

export async function deleteComponent(id: string) {
  const existing = await prisma.equipmentComponent.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Component not found");
  }

  await prisma.equipmentComponent.delete({ where: { id } });
}
