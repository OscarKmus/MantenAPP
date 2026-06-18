import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "./equipment.schema";
import type { EquipmentStatus } from "@mantenti/types";

export async function listEquipment(clientId: string, status?: EquipmentStatus) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  const where: { clientId: string; status?: EquipmentStatus } = { clientId };
  if (status) {
    where.status = status;
  }

  return prisma.equipment.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function getEquipment(id: string) {
  const equipment = await prisma.equipment.findUnique({ where: { id } });
  if (!equipment) {
    throw createError(404, "Equipment not found");
  }
  return equipment;
}

export async function createEquipment(clientId: string, input: CreateEquipmentInput) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
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
  };

  return prisma.equipment.create({ data });
}

export async function updateEquipment(id: string, input: UpdateEquipmentInput) {
  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Equipment not found");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.ip !== undefined) data.ip = input.ip;
  if (input.mac !== undefined) data.mac = input.mac;
  if (input.serial !== undefined) data.serial = input.serial;
  if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
  if (input.status !== undefined) data.status = input.status;

  return prisma.equipment.update({
    where: { id },
    data,
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
