import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import type { CreateClientInput, UpdateClientInput } from "./clients.schema";

function computeEffectiveDate(
  baseAt: Date | null,
  agreedAt: Date | null,
  manualOverride: Date | null
): Date | null {
  return manualOverride ?? agreedAt ?? baseAt;
}

export async function listClients(query?: string, userId?: string) {
  const where: Record<string, unknown> = query
    ? {
        name: { contains: query, mode: "insensitive" as const },
      }
    : {};

  if (userId) {
    where.createdById = userId;
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { equipment: true } },
    },
  });

  return clients.map(({ _count, ...client }) => ({
    ...client,
    equipmentCount: _count.equipment,
  }));
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      equipment: { orderBy: { name: "asc" } },
      templates: { orderBy: { name: "asc" } },
      _count: { select: { equipment: true } },
    },
  });

  if (!client) {
    throw createError(404, "Client not found");
  }

  const { _count, ...rest } = client;
  return { ...rest, equipmentCount: _count.equipment };
}

export async function createClient(input: CreateClientInput, createdById?: string) {
  // Compute base date if frequency is provided
  let nextMaintenanceBaseAt: Date | null = null;
  if (input.frequencyDays) {
    nextMaintenanceBaseAt = new Date();
    nextMaintenanceBaseAt.setDate(nextMaintenanceBaseAt.getDate() + input.frequencyDays);
  }

  const client = await prisma.client.create({
    data: {
      name: input.name,
      location: input.location,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      frequencyDays: input.frequencyDays,
      nextMaintenanceBaseAt,
      nextMaintenanceAt: nextMaintenanceBaseAt, // effective defaults to base
      ...(createdById && { createdById }),
    },
  });

  return client;
}

export async function updateClient(id: string, input: UpdateClientInput) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Client not found");
  }

  // Recompute base if frequency changed
  let nextMaintenanceBaseAt = existing.nextMaintenanceBaseAt;
  if (input.frequencyDays !== undefined) {
    if (input.frequencyDays === null) {
      nextMaintenanceBaseAt = null;
    } else {
      // Recalculate from last closed maintenance or from now
      const lastMaintenance = await prisma.maintenance.findFirst({
        where: { clientId: id, status: "CLOSED" },
        orderBy: { closedAt: "desc" },
        select: { closedAt: true },
      });

      const baseDate = lastMaintenance?.closedAt ?? new Date();
      nextMaintenanceBaseAt = new Date(baseDate);
      nextMaintenanceBaseAt.setDate(nextMaintenanceBaseAt.getDate() + input.frequencyDays);
    }
  }

  // Parse agreed date
  let nextMaintenanceAgreedAt = existing.nextMaintenanceAgreedAt;
  if (input.nextMaintenanceAgreedAt !== undefined) {
    nextMaintenanceAgreedAt = input.nextMaintenanceAgreedAt
      ? new Date(input.nextMaintenanceAgreedAt)
      : null;
  }

  // Compute effective date
  let nextMaintenanceAt: Date | null;
  if (input.nextMaintenanceAt !== undefined) {
    // Manual override takes precedence
    nextMaintenanceAt = input.nextMaintenanceAt
      ? new Date(input.nextMaintenanceAt)
      : null;
  } else {
    // Recompute from existing override or agreed/base
    nextMaintenanceAt = computeEffectiveDate(
      nextMaintenanceBaseAt,
      nextMaintenanceAgreedAt,
      null // no new override — let agreed/base decide
    );
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.frequencyDays !== undefined && { frequencyDays: input.frequencyDays }),
      nextMaintenanceBaseAt,
      nextMaintenanceAgreedAt,
      nextMaintenanceAt,
    },
  });

  return client;
}

export async function deleteClient(id: string) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Client not found");
  }

  // The DB has onDelete: Cascade for Equipment, Maintenance, and Template.
  // The only manual cleanup needed is polymorphic Attachment rows (no FK relation).
  // We collect the IDs first, then delete in a transaction, then clean up files.

  const maintenances = await prisma.maintenance.findMany({
    where: { clientId: id },
    select: { id: true, signatureData: true },
  });
  const maintenanceIds = maintenances.map((m) => m.id);
  const signaturePaths = maintenances.map((m) => m.signatureData).filter((p): p is string => !!p);

  const items = await prisma.maintenanceItem.findMany({
    where: {
      OR: [
        { maintenanceId: { in: maintenanceIds } },
        { equipment: { clientId: id } },
      ],
    },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  // Find attachments that will be orphaned
  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: { in: maintenanceIds } },
        { scope: "MAINTENANCE_ITEM", parentId: { in: itemIds } },
      ],
    },
    select: { id: true, storagePath: true },
  });

  // Transaction: clean up attachment rows + delete client (cascade does the rest)
  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: {
        id: { in: attachments.map((a) => a.id) },
      },
    }),
    prisma.client.delete({ where: { id } }),
  ]);

  // Best-effort file cleanup (after DB transaction)
  for (const att of attachments) {
    try {
      await localStorage.delete(att.storagePath);
    } catch {
      // File may already be missing — ignore
    }
  }
  for (const sigPath of signaturePaths) {
    try {
      await localStorage.delete(sigPath);
    } catch {
      // ignore
    }
  }
}
