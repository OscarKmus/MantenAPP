import * as fs from "fs";
import * as path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import prisma from "../../lib/prisma";
import { getEnv } from "../../config/env";
import { MaintenanceReport } from "./report-template";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

// ─── Report Number ─────────────────────────────────────
function generateReportNumber(maintenanceId: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const suffix = maintenanceId.substring(0, 8).toUpperCase();
  return `MT-${y}${m}${d}-${suffix}`;
}

// ─── Duration Calculation ──────────────────────────────
function calculateDuration(createdAt: Date, closedAt: Date): string {
  const diffMs = closedAt.getTime() - createdAt.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

// ─── Get Identifier (IP, MAC, or Serial) ──────────────
function getIdentifier(equipment: {
  ip: string | null;
  mac: string | null;
  serial: string | null;
}): string | null {
  if (equipment.ip) return equipment.ip;
  if (equipment.mac) return equipment.mac;
  if (equipment.serial) return equipment.serial;
  return null;
}

// ─── Generate PDF ──────────────────────────────────────
export async function generateMaintenancePdf(
  maintenanceId: string
): Promise<{ pdfPath: string; pdfEngine: string }> {
  const env = getEnv();

  // Fetch maintenance with all relations
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
    include: {
      client: true,
      technician: {
        select: { id: true, username: true, fullName: true },
      },
      items: {
        include: {
          equipment: {
            include: { category: true },
          },
          actionType: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!maintenance) {
    throw new Error("Maintenance not found");
  }

  if (maintenance.status !== "CLOSED") {
    throw new Error("Maintenance must be closed before generating PDF");
  }

  // Fetch attachments
  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: maintenanceId },
        {
          scope: "MAINTENANCE_ITEM",
          parentId: { in: maintenance.items.map((i) => i.id) },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // ─── Build report data ─────────────────────────────
  const closedAt = maintenance.closedAt || maintenance.updatedAt;
  const duration = calculateDuration(maintenance.createdAt, closedAt);

  // Items
  const items = maintenance.items.map((item) => {
    const itemAttachments = attachments.filter(
      (a) => a.scope === "MAINTENANCE_ITEM" && a.parentId === item.id
    );
    return {
      equipmentName: item.equipment.name,
      categoryName: item.equipment.category?.name || null,
      identifier: getIdentifier(item.equipment),
      actionTypeName: item.actionType?.name || null,
      actionTypeColor: item.actionType?.color || null,
      observations: item.observations,
      photoCount: itemAttachments.length,
      completed: !!item.completedAt,
    };
  });

  // Photos (maintenance-level + item-level)
  const photos: Array<{ data: string; caption: string }> = [];

  // Maintenance-level photos
  const maintenanceAttachments = attachments.filter(
    (a) => a.scope === "MAINTENANCE"
  );
  for (const att of maintenanceAttachments) {
    const filePath = path.join(STORAGE_ROOT, att.storagePath);
    try {
      const buffer = await fs.promises.readFile(filePath);
      const base64 = buffer.toString("base64");
      photos.push({
        data: `data:${att.mimeType};base64,${base64}`,
        caption: att.fileName,
      });
    } catch {
      // Skip missing files
    }
  }

  // Item-level photos
  for (const item of maintenance.items) {
    const itemAtts = attachments.filter(
      (a) => a.scope === "MAINTENANCE_ITEM" && a.parentId === item.id
    );
    for (const att of itemAtts) {
      const filePath = path.join(STORAGE_ROOT, att.storagePath);
      try {
        const buffer = await fs.promises.readFile(filePath);
        const base64 = buffer.toString("base64");
        photos.push({
          data: `data:${att.mimeType};base64,${base64}`,
          caption: `${item.equipment.name} — ${att.fileName}`,
        });
      } catch {
        // Skip missing files
      }
    }
  }

  // Signatures
  let clientSignatureData: string | null = null;
  let technicianSignatureData: string | null = null;

  if (maintenance.signatureData) {
    const sigPath = path.join(STORAGE_ROOT, maintenance.signatureData);
    try {
      const sigBuffer = await fs.promises.readFile(sigPath);
      clientSignatureData = `data:image/png;base64,${sigBuffer.toString("base64")}`;
    } catch {
      // Signature file missing
    }
  }

  if (maintenance.technicianSignatureData) {
    const sigPath = path.join(STORAGE_ROOT, maintenance.technicianSignatureData);
    try {
      const sigBuffer = await fs.promises.readFile(sigPath);
      technicianSignatureData = `data:image/png;base64,${sigBuffer.toString("base64")}`;
    } catch {
      // Signature file missing
    }
  }

  const reportData = {
    companyName: env.COMPANY_NAME,
    companyLogoUrl: env.COMPANY_LOGO_URL || undefined,
    reportNumber: generateReportNumber(maintenanceId),
    maintenanceId,
    closedAt: closedAt.toISOString(),
    technicianName: maintenance.technician.fullName,
    duration,
    client: {
      name: maintenance.client.name,
      location: maintenance.client.location,
      contactName: maintenance.client.contactName,
      contactPhone: maintenance.client.contactPhone,
      contactEmail: maintenance.client.contactEmail,
      nextMaintenanceBaseAt:
        maintenance.client.nextMaintenanceBaseAt?.toISOString() || null,
      nextMaintenanceAgreedAt:
        maintenance.client.nextMaintenanceAgreedAt?.toISOString() || null,
      nextMaintenanceAt:
        maintenance.client.nextMaintenanceAt?.toISOString() || null,
    },
    items,
    photos,
    clientSignatureData,
    technicianSignatureData,
    notes: maintenance.notes,
  };

  // ─── Render PDF ────────────────────────────────────
  const element = React.createElement(MaintenanceReport, { data: reportData });
  const buffer = await renderToBuffer(element as any);

  // ─── Save to storage ──────────────────────────────
  const year = closedAt.getFullYear().toString();
  const month = (closedAt.getMonth() + 1).toString().padStart(2, "0");
  const pdfDir = path.join(STORAGE_ROOT, "pdfs", year, month);
  await fs.promises.mkdir(pdfDir, { recursive: true });

  const pdfFilename = `${maintenanceId}.pdf`;
  const pdfFullPath = path.join(pdfDir, pdfFilename);
  await fs.promises.writeFile(pdfFullPath, buffer);

  const pdfStoragePath = `pdfs/${year}/${month}/${pdfFilename}`;

  // ─── Update DB ────────────────────────────────────
  await prisma.maintenance.update({
    where: { id: maintenanceId },
    data: {
      pdfPath: pdfStoragePath,
      pdfEngine: "react-pdf",
    },
  });

  return { pdfPath: pdfStoragePath, pdfEngine: "react-pdf" };
}

// ─── Get PDF Path ──────────────────────────────────────
export async function getMaintenancePdfPath(
  maintenanceId: string
): Promise<string> {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
    select: { pdfPath: true, status: true },
  });

  if (!maintenance) {
    throw Object.assign(new Error("Maintenance not found"), { status: 404 });
  }

  if (maintenance.status !== "CLOSED") {
    throw Object.assign(new Error("Maintenance is not closed"), {
      status: 400,
    });
  }

  if (!maintenance.pdfPath) {
    throw Object.assign(
      new Error("PDF not generated. Call POST /regenerate first."),
      { status: 404 }
    );
  }

  const fullPath = path.join(STORAGE_ROOT, maintenance.pdfPath);
  try {
    await fs.promises.access(fullPath, fs.constants.R_OK);
  } catch {
    throw Object.assign(new Error("PDF file not found on disk"), {
      status: 404,
    });
  }

  return fullPath;
}

// ─── Regenerate PDF ────────────────────────────────────
export async function regenerateMaintenancePdf(
  maintenanceId: string
): Promise<{ pdfPath: string; pdfEngine: string }> {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
    select: { pdfPath: true },
  });

  if (!maintenance) {
    throw Object.assign(new Error("Maintenance not found"), { status: 404 });
  }

  // Delete old PDF if exists
  if (maintenance.pdfPath) {
    const oldPath = path.join(STORAGE_ROOT, maintenance.pdfPath);
    try {
      await fs.promises.unlink(oldPath);
    } catch {
      // File already gone
    }
  }

  return generateMaintenancePdf(maintenanceId);
}
