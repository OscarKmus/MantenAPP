import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { CreateCategoryInput, UpdateCategoryInput } from "./equipment-categories.schema";

export async function listCategories() {
  return prisma.equipmentCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getCategory(id: string) {
  const category = await prisma.equipmentCategory.findUnique({ where: { id } });
  if (!category) {
    throw createError(404, "Category not found");
  }
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.equipmentCategory.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    throw createError(409, "Category with this name already exists");
  }

  return prisma.equipmentCategory.create({
    data: {
      name: input.name,
      icon: input.icon ?? null,
      isComputer: input.isComputer ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await prisma.equipmentCategory.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Category not found");
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.equipmentCategory.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw createError(409, "Category with this name already exists");
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.isComputer !== undefined) data.isComputer = input.isComputer;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

  return prisma.equipmentCategory.update({
    where: { id },
    data,
  });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.equipmentCategory.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Category not found");
  }

  const usageCount = await prisma.equipment.count({
    where: { categoryId: id },
  });

  if (usageCount > 0) {
    throw createError(409, "Cannot delete category that is assigned to equipment");
  }

  await prisma.equipmentCategory.delete({ where: { id } });
}
