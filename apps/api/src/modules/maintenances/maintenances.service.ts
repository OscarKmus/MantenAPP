import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import { generateMaintenancePdf } from "../../services/pdf/pdf.service";
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  UpdateMaintenanceItemInput,
  CloseMaintenanceInput,
} from "./maintenances.schema";

export async function createMaintenance(technicianId: string, input: CreateMaintenanceInput) {
  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  // Verify all equipment belongs to this client
  const equipment = await prisma.equipment.findMany({
    where: { id: { in: input.equipmentIds }, clientId: input.clientId },
    select: { id: true },
  });
  if (equipment.length !== input.equipmentIds.length) {
    throw createError(400, "One or more equipment items not found for this client");
  }

  // If templateId provided, verify it exists and belongs to this client
  if (input.templateId) {
    const template = await prisma.template.findUnique({
      where: { id: input.templateId },
    });
    if (!template || template.clientId !== input.clientId) {
      throw createError(400, "Template not found for this client");
    }
  }

  // Create maintenance with items
  const maintenance = await prisma.maintenance.create({
    data: {
      clientId: input.clientId,
      technicianId,
      status: "DRAFT",
      items: {
        create: input.equipmentIds.map((equipmentId) => ({
          equipmentId,
        })),
      },
    },
    include: {
      items: {
        include: {
          equipment: true,
          actionType: true,
        },
      },
    },
  });

  return maintenance;
}

export async function getMaintenance(id: string) {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          equipment: true,
          actionType: true,
        },
        orderBy: { createdAt: "asc" },
      },
      client: true,
      technician: {
        select: { id: true, username: true, fullName: true },
      },
    },
  });

  if (!maintenance) {
    throw createError(404, "Maintenance not found");
  }

  // Fetch attachments for this maintenance (both scopes)
  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: id },
        { scope: "MAINTENANCE_ITEM", parentId: { in: maintenance.items.map((item) => item.id) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return { maintenance, attachments };
}

export async function updateMaintenance(id: string, input: UpdateMaintenanceInput) {
  const existing = await prisma.maintenance.findUnique({ where: { id } });
  if (!existing) {
    throw createError(404, "Maintenance not found");
  }

  if (existing.status === "CLOSED") {
    throw createError(403, "Cannot edit a closed maintenance");
  }

  const data: Record<string, unknown> = {};
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  return prisma.maintenance.update({
    where: { id },
    data,
    include: {
      items: {
        include: {
          equipment: true,
          actionType: true,
        },
      },
    },
  });
}

export async function updateMaintenanceItem(
  maintenanceId: string,
  itemId: string,
  input: UpdateMaintenanceItemInput
) {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
  });
  if (!maintenance) {
    throw createError(404, "Maintenance not found");
  }

  if (maintenance.status === "CLOSED") {
    throw createError(403, "Cannot edit items on a closed maintenance");
  }

  const item = await prisma.maintenanceItem.findUnique({
    where: { id: itemId },
  });
  if (!item || item.maintenanceId !== maintenanceId) {
    throw createError(404, "Maintenance item not found");
  }

  const data: Record<string, unknown> = {};
  if (input.actionTypeId !== undefined) data.actionTypeId = input.actionTypeId;
  if (input.observations !== undefined) data.observations = input.observations;
  if (input.completed !== undefined) {
    data.completedAt = input.completed ? new Date() : null;
  }

  // Auto-transition to IN_PROGRESS when first item is updated
  if (maintenance.status === "DRAFT" && Object.keys(data).length > 0) {
    await prisma.maintenance.update({
      where: { id: maintenanceId },
      data: { status: "IN_PROGRESS" },
    });
  }

  return prisma.maintenanceItem.update({
    where: { id: itemId },
    data,
    include: {
      equipment: true,
      actionType: true,
    },
  });
}

export async function removeMaintenanceItem(maintenanceId: string, itemId: string) {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
  });
  if (!maintenance) {
    throw createError(404, "Maintenance not found");
  }

  if (maintenance.status === "CLOSED") {
    throw createError(403, "Cannot remove items from a closed maintenance");
  }

  const item = await prisma.maintenanceItem.findUnique({
    where: { id: itemId },
  });
  if (!item || item.maintenanceId !== maintenanceId) {
    throw createError(404, "Maintenance item not found");
  }

  // Also delete attachments for this item
  await prisma.attachment.deleteMany({
    where: { scope: "MAINTENANCE_ITEM", parentId: itemId },
  });

  await prisma.maintenanceItem.delete({ where: { id: itemId } });
}

export async function closeMaintenance(id: string, input: CloseMaintenanceInput) {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!maintenance) {
    throw createError(404, "Maintenance not found");
  }

  if (maintenance.status === "CLOSED") {
    throw createError(409, "Maintenance is already closed");
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  // Helper to save a signature dataURL to disk and return storage path
  async function saveSignature(dataUrl: string, suffix: string): Promise<string> {
    const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length < 100) {
      throw createError(400, `Signature (${suffix}) is too small`);
    }
    const filename = `${id}-${suffix}.png`;
    const storagePath = `signatures/${year}/${month}/${filename}`;
    const fullPath = require("path").resolve(process.cwd(), "storage", storagePath);
    const dir = require("path").dirname(fullPath);
    await require("fs").promises.mkdir(dir, { recursive: true });
    await require("fs").promises.writeFile(fullPath, buffer);
    return storagePath;
  }

  // Save both signatures
  const clientSigPath = await saveSignature(input.clientSignatureData, "client");
  const techSigPath = await saveSignature(input.technicianSignatureData, "tech");

  // Update maintenance: close it, store both signature paths
  const updated = await prisma.maintenance.update({
    where: { id },
    data: {
      status: "CLOSED",
      signatureData: clientSigPath,
      technicianSignatureData: techSigPath,
      closedAt: now,
      pdfPath: null,
      pdfEngine: null,
    },
    include: {
      items: {
        include: {
          equipment: true,
          actionType: true,
        },
      },
      client: true,
    },
  });

  // Generate PDF synchronously. If it fails, log and continue — the user can
  // regenerate manually. The DB has already been updated with the closure.
  let pdfPath: string | null = null;
  let pdfEngine: string | null = null;
  try {
    const result = await generateMaintenancePdf(id);
    pdfPath = result.pdfPath;
    pdfEngine = result.pdfEngine;
  } catch (e) {
    console.error(`[close] PDF generation failed for maintenance ${id}:`, e);
  }

  // Recalculate next maintenance for the client if frequency is set
  if (updated.client.frequencyDays != null) {
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + updated.client.frequencyDays);

    await prisma.client.update({
      where: { id: updated.clientId },
      data: {
        nextMaintenanceBaseAt: nextDate,
        nextMaintenanceAt: updated.client.nextMaintenanceAt ?? nextDate,
      },
    });
  }

  // Reload with pdfPath set (or return as-is if PDF failed)
  if (pdfPath) {
    return prisma.maintenance.update({
      where: { id },
      data: { pdfPath, pdfEngine },
      include: { items: { include: { equipment: true, actionType: true } }, client: true },
    });
  }

  return updated;
}

export async function listClientMaintenances(
  clientId: string,
  page: number = 1,
  limit: number = 20
) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw createError(404, "Client not found");
  }

  const skip = (page - 1) * limit;

  const [maintenances, total] = await Promise.all([
    prisma.maintenance.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        technician: {
          select: { id: true, username: true, fullName: true },
        },
        _count: { select: { items: true } },
      },
    }),
    prisma.maintenance.count({ where: { clientId } }),
  ]);

  return { maintenances, total, page, limit };
}
