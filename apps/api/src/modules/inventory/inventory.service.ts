import prisma from "../../lib/prisma";
import type { InventoryQueryInput } from "./inventory.schema";
import type { EquipmentStatus, LicenseType } from "@mantenti/types";

export async function getInventory(filters: InventoryQueryInput) {
  const equipmentWhere: Record<string, unknown> = {};
  const softwareWhere: Record<string, unknown> = {};

  // Common filters
  if (filters.clientId) {
    equipmentWhere.clientId = filters.clientId;
    softwareWhere.clientId = filters.clientId;
  }

  // Equipment-specific filters
  if (filters.categoryId) {
    equipmentWhere.categoryId = filters.categoryId;
  }
  if (filters.status) {
    equipmentWhere.status = filters.status as EquipmentStatus;
  }

  // Software-specific filters
  if (filters.licenseType) {
    softwareWhere.licenseType = filters.licenseType as LicenseType;
  }

  // Search filter (applies to both)
  if (filters.search) {
    const searchPattern = { contains: filters.search, mode: "insensitive" as const };
    equipmentWhere.name = searchPattern;
    softwareWhere.name = searchPattern;
  }

  const [equipment, software] = await Promise.all([
    prisma.equipment.findMany({
      where: equipmentWhere,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true, icon: true, isComputer: true } },
        softwareLicenses: true,
      },
    }),
    prisma.software.findMany({
      where: softwareWhere,
      orderBy: { expiresAt: "asc" },
      include: {
        equipment: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { equipment, software };
}
