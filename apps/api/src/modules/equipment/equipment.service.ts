import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "./equipment.schema";
import type { EquipmentStatus } from "@mantenti/types";

interface CascadeCounts {
  equipment: number;
  maintenanceItems: number;
  attachments: number;
  files: number;
}

interface BulkDeleteResult {
  deleted: number;
  ids: string[];
  skipped?: { id: string; reason: string }[];
}

export async function listEquipment(clientId: string, status?: EquipmentStatus) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  const where: Record<string, unknown> = { clientId };
  if (status) {
    where.status = status;
  }
  return prisma.equipment.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true, icon: true, isComputer: true } },
      software: true,
    },
  });
}

export async function getEquipment(id: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, icon: true, isComputer: true } },
      software: true,
    },
  });
  if (!equipment) {
    throw createError(404, "Equipment not found");
  }
  return equipment;
}

export async function createEquipment(clientId: string, input: CreateEquipmentInput, createdById?: string) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  // Validate category if provided
  if (input.categoryId) {
    const category = await prisma.equipmentCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw createError(404, "Category not found");
    }
  }

  // Normalize empty strings to null
  const data = {
    clientId,
    name: input.name,
    ip: input.ip || null,
    mac: input.mac || null,
    serial: input.serial || null,
    assignedTo: input.assignedTo || null,
    status: input.status ?? "ACTIVE",
    categoryId: input.categoryId ?? null,
    softwareId: input.softwareId ?? null,
    processor: input.processor || null,
    ram: input.ram || null,
    disk: input.disk || null,
    ...(createdById && { createdById }),
  };

  return prisma.equipment.create({
    data,
    include: {
      category: { select: { id: true, name: true, icon: true, isComputer: true } },
      software: true,
    },
  });
}

export async function updateEquipment(id: string, input: UpdateEquipmentInput) {
  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Equipment not found");
  }

  // Validate category if provided
  if (input.categoryId) {
    const category = await prisma.equipmentCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw createError(404, "Category not found");
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.ip !== undefined) data.ip = input.ip;
  if (input.mac !== undefined) data.mac = input.mac;
  if (input.serial !== undefined) data.serial = input.serial;
  if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
  if (input.status !== undefined) data.status = input.status;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.softwareId !== undefined) data.softwareId = input.softwareId;
  if (input.processor !== undefined) data.processor = input.processor;
  if (input.ram !== undefined) data.ram = input.ram;
  if (input.disk !== undefined) data.disk = input.disk;

  return prisma.equipment.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true, icon: true, isComputer: true } },
      software: true,
    },
  });
}

export async function deleteEquipment(id: string) {
  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Equipment not found");
  }

  // The DB has onDelete: Cascade for MaintenanceItem. The only manual cleanup
  // needed is polymorphic Attachment rows for those items.

  const items = await prisma.maintenanceItem.findMany({
    where: { equipmentId: id },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  const attachments = await prisma.attachment.findMany({
    where: {
      scope: "MAINTENANCE_ITEM",
      parentId: { in: itemIds },
    },
    select: { id: true, storagePath: true },
  });

  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { id: { in: attachments.map((a) => a.id) } },
    }),
    prisma.equipment.delete({ where: { id } }),
  ]);

  // Best-effort file cleanup
  for (const att of attachments) {
    try {
      await localStorage.delete(att.storagePath);
    } catch {
      // ignore
    }
  }
}

/**
 * Cascade preview for bulk delete: returns counts of entities that would be deleted.
 *
 * Uses 3 separate count queries (not a single JOIN) to avoid fan-out from 1:N joins.
 * All queries use IN(...) with indexed FK columns — expected cost: 3 index scans.
 * For 100 equipment entries this should complete in < 50ms.
 */
export async function cascadePreviewEquipment(ids: string[]): Promise<CascadeCounts> {
  // 1. Count equipment that exist
  const equipmentCount = await prisma.equipment.count({
    where: { id: { in: ids } },
  });

  // 2. Count maintenance items linked to those equipment entries
  const maintenanceItemsCount = await prisma.maintenanceItem.count({
    where: { equipmentId: { in: ids } },
  });

  // 3. Count attachments (polymorphic) for maintenance items of those equipment
  const itemIds = await prisma.maintenanceItem.findMany({
    where: { equipmentId: { in: ids } },
    select: { id: true },
  });
  const itemIdList = itemIds.map((i) => i.id);

  const attachmentsCount = await prisma.attachment.count({
    where: {
      scope: "MAINTENANCE_ITEM",
      parentId: { in: itemIdList },
    },
  });

  // Files count equals attachments count (each attachment is a file)
  return {
    equipment: equipmentCount,
    maintenanceItems: maintenanceItemsCount,
    attachments: attachmentsCount,
    files: attachmentsCount,
  };
}

/**
 * Bulk delete equipment with cascade. All-or-nothing in a single transaction.
 *
 * Cascade order (handled by DB onDelete: Cascade):
 *   attachments → files → maintenanceItems → equipment
 *
 * Pre-validates all ids exist before the transaction. Returns skipped items
 * for any ids that don't exist (no partial deletion).
 */
export async function bulkDeleteEquipment(ids: string[]): Promise<BulkDeleteResult> {
  // Pre-validate: check all ids exist
  const existing = await prisma.equipment.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return {
      deleted: 0,
      ids: [],
      skipped: missingIds.map((id) => ({ id, reason: "Equipment not found" })),
    };
  }

  // Collect attachment paths for post-transaction file cleanup
  const items = await prisma.maintenanceItem.findMany({
    where: { equipmentId: { in: ids } },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  const attachments = await prisma.attachment.findMany({
    where: {
      scope: "MAINTENANCE_ITEM",
      parentId: { in: itemIds },
    },
    select: { id: true, storagePath: true },
  });

  // Transaction: delete attachments (manual), then equipment (DB cascade handles rest)
  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { id: { in: attachments.map((a) => a.id) } },
    }),
    prisma.equipment.deleteMany({
      where: { id: { in: ids } },
    }),
  ]);

  // Best-effort file cleanup (after DB transaction)
  for (const att of attachments) {
    try {
      await localStorage.delete(att.storagePath);
    } catch {
      // File may already be missing — ignore
    }
  }

  return {
    deleted: ids.length,
    ids,
  };
}
