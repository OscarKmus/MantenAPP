import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import type { CreateSoftwareInput, UpdateSoftwareInput } from "./software.schema";
import type { LicenseType } from "@mantenti/types";

export async function listSoftware(filters: {
  clientId?: string;
  equipmentId?: string;
  licenseType?: LicenseType;
}) {
  const where: Record<string, unknown> = {};

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.equipmentId) where.equipmentId = filters.equipmentId;
  if (filters.licenseType) where.licenseType = filters.licenseType;

  return prisma.software.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      equipment: { select: { id: true, name: true } },
    },
  });
}

export async function getSoftware(id: string) {
  const software = await prisma.software.findUnique({
    where: { id },
    include: {
      equipment: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });
  if (!software) {
    throw createError(404, "Software not found");
  }
  return software;
}

export async function createSoftware(input: CreateSoftwareInput) {
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  if (input.equipmentId) {
    const equipment = await prisma.equipment.findUnique({ where: { id: input.equipmentId } });
    if (!equipment) {
      throw createError(404, "Equipment not found");
    }
  }

  return prisma.software.create({
    data: {
      name: input.name,
      licenseType: input.licenseType as LicenseType,
      clientId: input.clientId,
      equipmentId: input.equipmentId ?? null,
      expiresAt: new Date(input.expiresAt),
      notes: input.notes ?? null,
    },
  });
}

export async function updateSoftware(id: string, input: UpdateSoftwareInput) {
  const existing = await prisma.software.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Software not found");
  }

  if (input.equipmentId) {
    const equipment = await prisma.equipment.findUnique({ where: { id: input.equipmentId } });
    if (!equipment) {
      throw createError(404, "Equipment not found");
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.licenseType !== undefined) data.licenseType = input.licenseType;
  if (input.equipmentId !== undefined) data.equipmentId = input.equipmentId;
  if (input.expiresAt !== undefined) data.expiresAt = new Date(input.expiresAt);
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.software.update({
    where: { id },
    data,
  });
}

export async function deleteSoftware(id: string) {
  const existing = await prisma.software.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Software not found");
  }

  await prisma.software.delete({ where: { id } });
}

export async function listSoftwareByClient(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  return prisma.software.findMany({
    where: { clientId },
    orderBy: { expiresAt: "asc" },
    include: {
      equipment: { select: { id: true, name: true } },
    },
  });
}

export async function listSoftwareByEquipment(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) {
    throw createError(404, "Equipment not found");
  }

  return prisma.software.findMany({
    where: { equipmentId },
    orderBy: { expiresAt: "asc" },
  });
}
