import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import type { CreateClientInput, UpdateClientInput } from "./clients.schema";

interface CascadeCounts {
  clients: number;
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

function computeEffectiveDate(
  baseAt: Date | null,
  agreedAt: Date | null,
  manualOverride: Date | null
): Date | null {
  return manualOverride ?? agreedAt ?? baseAt;
}

export async function listClients(query?: string) {
  const where = query
    ? {
        name: { contains: query, mode: "insensitive" as const },
      }
    : {};

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

export async function createClient(input: CreateClientInput) {
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

/**
 * Cascade preview for bulk delete: returns counts of entities that would be deleted.
 *
 * Uses 4 separate count queries (not a single JOIN) to avoid fan-out from 1:N joins.
 * All queries use IN(...) with indexed FK columns — expected cost: 4 index scans.
 * For 100 clients this should complete in < 100ms.
 */
export async function cascadePreviewClients(ids: string[]): Promise<CascadeCounts> {
  // 1. Count clients that exist
  const clientsCount = await prisma.client.count({
    where: { id: { in: ids } },
  });

  // 2. Count equipment belonging to those clients
  const equipmentCount = await prisma.equipment.count({
    where: { clientId: { in: ids } },
  });

  // 3. Count maintenance items linked to equipment of those clients
  //    OR linked to maintenances of those clients
  const maintenanceItemsCount = await prisma.maintenanceItem.count({
    where: {
      OR: [
        { equipment: { clientId: { in: ids } } },
        { maintenance: { clientId: { in: ids } } },
      ],
    },
  });

  // 4. Count attachments (polymorphic) for maintenances and maintenance items
  //    of those clients
  const maintenanceIds = await prisma.maintenance.findMany({
    where: { clientId: { in: ids } },
    select: { id: true },
  });
  const maintenanceIdList = maintenanceIds.map((m) => m.id);

  const itemIds = await prisma.maintenanceItem.findMany({
    where: {
      OR: [
        { equipment: { clientId: { in: ids } } },
        { maintenanceId: { in: maintenanceIdList } },
      ],
    },
    select: { id: true },
  });
  const itemIdList = itemIds.map((i) => i.id);

  const attachmentsCount = await prisma.attachment.count({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: { in: maintenanceIdList } },
        { scope: "MAINTENANCE_ITEM", parentId: { in: itemIdList } },
      ],
    },
  });

  // Files count equals attachments count (each attachment is a file)
  return {
    clients: clientsCount,
    equipment: equipmentCount,
    maintenanceItems: maintenanceItemsCount,
    attachments: attachmentsCount,
    files: attachmentsCount,
  };
}

/**
 * Bulk delete clients with cascade. All-or-nothing in a single transaction.
 *
 * Cascade order (handled by DB onDelete: Cascade):
 *   attachments → files → maintenanceItems → equipment → client
 *
 * Pre-validates all ids exist before the transaction. Returns skipped items
 * for any ids that don't exist (no partial deletion).
 */
export async function bulkDeleteClients(ids: string[]): Promise<BulkDeleteResult> {
  // Pre-validate: check all ids exist
  const existing = await prisma.client.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((c) => c.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    return {
      deleted: 0,
      ids: [],
      skipped: missingIds.map((id) => ({ id, reason: "Client not found" })),
    };
  }

  // Collect attachment paths for post-transaction file cleanup
  const maintenances = await prisma.maintenance.findMany({
    where: { clientId: { in: ids } },
    select: { id: true, signatureData: true },
  });
  const maintenanceIds = maintenances.map((m) => m.id);
  const signaturePaths = maintenances
    .map((m) => m.signatureData)
    .filter((p): p is string => !!p);

  const items = await prisma.maintenanceItem.findMany({
    where: {
      OR: [
        { maintenanceId: { in: maintenanceIds } },
        { equipment: { clientId: { in: ids } } },
      ],
    },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: { in: maintenanceIds } },
        { scope: "MAINTENANCE_ITEM", parentId: { in: itemIds } },
      ],
    },
    select: { id: true, storagePath: true },
  });

  // Transaction: delete attachments (manual), then clients (DB cascade handles rest)
  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: { id: { in: attachments.map((a) => a.id) } },
    }),
    prisma.client.deleteMany({
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
  for (const sigPath of signaturePaths) {
    try {
      await localStorage.delete(sigPath);
    } catch {
      // ignore
    }
  }

  return {
    deleted: ids.length,
    ids,
  };
}
