import * as fs from "fs";
import * as path from "path";
import PDFDocument from "pdfkit";
import prisma from "../../lib/prisma";
import { getEnv } from "../../config/env";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

// ─── Colors ─────────────────────────────────────────────
const BRAND_COLOR = "#2563eb";
const BRAND_LIGHT = "#eff6ff";
const TEXT_PRIMARY = "#1e293b";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const BORDER_COLOR = "#e2e8f0";
const SUCCESS_COLOR = "#16a34a";

// ─── Helpers ────────────────────────────────────────────
function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function generateReportNumber(maintenanceId: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const suffix = maintenanceId.substring(0, 8).toUpperCase();
  return `MT-${y}${m}${d}-${suffix}`;
}

function calculateDuration(createdAt: Date, closedAt: Date): string {
  const diffMs = closedAt.getTime() - createdAt.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getIpMac(equipment: {
  ip: string | null;
  mac: string | null;
}): string | null {
  if (equipment.ip && equipment.mac) return `${equipment.ip} / ${equipment.mac}`;
  if (equipment.ip) return equipment.ip;
  if (equipment.mac) return equipment.mac;
  return null;
}

// ─── PDF Generation ─────────────────────────────────────
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
  const reportNumber = generateReportNumber(maintenanceId);

  // Items data
  const items = maintenance.items.map((item) => {
    const itemAttachments = attachments.filter(
      (a) => a.scope === "MAINTENANCE_ITEM" && a.parentId === item.id
    );
    return {
      equipmentName: item.equipment.name,
      categoryName: item.equipment.category?.name || null,
      ipMac: getIpMac(item.equipment),
      actionTypeName: item.actionType?.name || null,
      actionTypeColor: item.actionType?.color || null,
      observations: item.observations,
      photoCount: itemAttachments.length,
      completed: !!item.completedAt,
    };
  });

  // Photos (maintenance-level + item-level)
  const photos: Array<{ buffer: Buffer; caption: string }> = [];

  const maintenanceAttachments = attachments.filter(
    (a) => a.scope === "MAINTENANCE"
  );
  for (const att of maintenanceAttachments) {
    const filePath = path.join(STORAGE_ROOT, att.storagePath);
    try {
      const buffer = await fs.promises.readFile(filePath);
      photos.push({ buffer, caption: att.fileName });
    } catch {
      // Skip missing files
    }
  }

  for (const item of maintenance.items) {
    const itemAtts = attachments.filter(
      (a) => a.scope === "MAINTENANCE_ITEM" && a.parentId === item.id
    );
    for (const att of itemAtts) {
      const filePath = path.join(STORAGE_ROOT, att.storagePath);
      try {
        const buffer = await fs.promises.readFile(filePath);
        photos.push({
          buffer,
          caption: `${item.equipment.name} — ${att.fileName}`,
        });
      } catch {
        // Skip missing files
      }
    }
  }

  // Signatures
  let clientSignatureBuffer: Buffer | null = null;
  let technicianSignatureBuffer: Buffer | null = null;

  if (maintenance.signatureData) {
    const sigPath = path.join(STORAGE_ROOT, maintenance.signatureData);
    try {
      clientSignatureBuffer = await fs.promises.readFile(sigPath);
    } catch {
      // Signature file missing
    }
  }

  if (maintenance.technicianSignatureData) {
    const sigPath = path.join(STORAGE_ROOT, maintenance.technicianSignatureData);
    try {
      technicianSignatureBuffer = await fs.promises.readFile(sigPath);
    } catch {
      // Signature file missing
    }
  }

  // ─── Generate PDF with PDFKit ─────────────────────
  const year = closedAt.getFullYear().toString();
  const month = (closedAt.getMonth() + 1).toString().padStart(2, "0");
  const pdfDir = path.join(STORAGE_ROOT, "pdfs", year, month);
  await fs.promises.mkdir(pdfDir, { recursive: true });

  const pdfFilename = `${maintenanceId}.pdf`;
  const pdfFullPath = path.join(pdfDir, pdfFilename);

  await new Promise<void>((resolve, reject) => {
    // `bufferPages: true` defers final page rendering until `doc.end()` is
    // called. We use this so we can `flushPages()` at the end and apply
    // per-page header/footer adjustments (e.g. signature line, page number)
    // across all generated pages in a single pass. Current Y position is
    // tracked manually per page via the `pageAdded` event — we do NOT use
    // `switchToPage(0)` (the original commit message referenced a
    // non-existent call). This pattern fixes the PDFKit crash on
    // `closeMaintenance` when generating multi-page reports.
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      info: {
        Title: "Reporte de Mantención",
        Author: env.COMPANY_NAME,
      },
    });

    const stream = fs.createWriteStream(pdfFullPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - 100; // margins
    let currentY = 50;

    // ─── Header ──────────────────────────────────────
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLOR)
      .text(env.COMPANY_NAME, 50, currentY);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(TEXT_SECONDARY)
      .text("Reporte de Mantención", 50, currentY + 28);

    // Blue line under header — gap de 25-30px desde fondo del subtítulo
    currentY += 65;
    doc
      .moveTo(50, currentY)
      .lineTo(50 + pageWidth, currentY)
      .strokeColor(BRAND_COLOR)
      .lineWidth(2)
      .stroke();

    currentY += 20;

    // ─── Metadata Grid ──────────────────────────────
    const metaBoxHeight = 60;
    doc
      .rect(50, currentY, pageWidth, metaBoxHeight)
      .fill(BRAND_LIGHT);

    const metaItems = [
      { label: "N° Reporte", value: reportNumber },
      { label: "Fecha", value: formatDateTime(closedAt.toISOString()) },
      { label: "Técnico", value: maintenance.technician.fullName },
      { label: "Duración", value: duration },
    ];

    const metaColWidth = pageWidth / 4;
    metaItems.forEach((item, i) => {
      const x = 50 + i * metaColWidth + 10;
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(TEXT_MUTED)
        .text(item.label.toUpperCase(), x, currentY + 10, {
          width: metaColWidth - 20,
        });
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(TEXT_PRIMARY)
        .text(item.value, x, currentY + 25, {
          width: metaColWidth - 20,
        });
    });

    currentY += metaBoxHeight + 20;

    // ─── Client Section ─────────────────────────────
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLOR)
      .text("Cliente", 50, currentY);

    currentY += 22;
    doc
      .moveTo(50, currentY)
      .lineTo(50 + pageWidth, currentY)
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .stroke();

    currentY += 12;

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(TEXT_PRIMARY)
      .text(maintenance.client.name, 50, currentY);

    currentY += 25;

    const clientFields = [
      { label: "Ubicación", value: maintenance.client.location },
      { label: "Contacto", value: maintenance.client.contactName },
      { label: "Teléfono", value: maintenance.client.contactPhone },
      { label: "Email", value: maintenance.client.contactEmail },
    ];

    for (const field of clientFields) {
      if (field.value) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(TEXT_MUTED)
          .text(field.label + ":", 50, currentY, { continued: true })
          .fillColor(TEXT_PRIMARY)
          .text(" " + field.value);
        currentY += 16;
      }
    }

    currentY += 10;

    // Date cards
    const dateCardWidth = (pageWidth - 10) / 2;
    const dateCardHeight = 50;

    // "Fecha de esta mantención" card
    doc
      .rect(50, currentY, dateCardWidth, dateCardHeight)
      .fill(BRAND_LIGHT);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(TEXT_SECONDARY)
      .text("FECHA DE ESTA MANTENCIÓN", 50 + 10, currentY + 10, {
        width: dateCardWidth - 20,
      });
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLOR)
      .text(
        formatDate(closedAt.toISOString()),
        50 + 10,
        currentY + 25,
        { width: dateCardWidth - 20 }
      );

    // "Próxima mantención" card
    if (maintenance.client.nextMaintenanceAt) {
      doc
        .rect(50 + dateCardWidth + 10, currentY, dateCardWidth, dateCardHeight)
        .fill("#f0fdf4");
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#16a34a")
        .text("PRÓXIMA MANTENCIÓN", 50 + dateCardWidth + 20, currentY + 10, {
          width: dateCardWidth - 20,
        });
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#15803d")
        .text(
          formatDate(maintenance.client.nextMaintenanceAt.toISOString()),
          50 + dateCardWidth + 20,
          currentY + 25,
          { width: dateCardWidth - 20 }
        );
    }

    currentY += dateCardHeight + 25;

    // ─── Equipment Table ────────────────────────────
    // Check if we need a new page
    if (currentY > 600) {
      doc.addPage();
      currentY = 50;
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(BRAND_COLOR)
      .text("Equipos Revisados", 50, currentY);

    currentY += 22;
    doc
      .moveTo(50, currentY)
      .lineTo(50 + pageWidth, currentY)
      .strokeColor(BORDER_COLOR)
      .lineWidth(1)
      .stroke();

    currentY += 12;

    // Table header
    const colWidths = [
      pageWidth * 0.22, // Equipo
      pageWidth * 0.13, // Categoría
      pageWidth * 0.15, // IP / MAC
      pageWidth * 0.15, // Acción
      pageWidth * 0.25, // Observaciones
      pageWidth * 0.10, // Revisado
    ];
    const colX = [50];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }

    const tableHeaderHeight = 22;
    doc.rect(50, currentY, pageWidth, tableHeaderHeight).fill(BRAND_COLOR);

    const headerLabels = [
      "EQUIPO",
      "CATEGORÍA",
      "IP / MAC",
      "ACCIÓN",
      "OBSERVACIONES",
      "REVISADO",
    ];

    headerLabels.forEach((label, i) => {
      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(label, colX[i] + 4, currentY + 7, {
          width: colWidths[i] - 8,
        });
    });

    currentY += tableHeaderHeight;

    // Table rows
    if (items.length === 0) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(TEXT_MUTED)
        .text("No hay equipos registrados", 50, currentY + 10, {
          align: "center",
          width: pageWidth,
        });
      currentY += 30;
    } else {
      items.forEach((item, idx) => {
        const rowHeight = 28;
        const rowBg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";

        // Check page break
        if (currentY + rowHeight > 750) {
          doc.addPage();
          currentY = 50;
        }

        doc.rect(50, currentY, pageWidth, rowHeight).fill(rowBg);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(TEXT_PRIMARY)
          .text(item.equipmentName, colX[0] + 4, currentY + 8, {
            width: colWidths[0] - 8,
          });

        doc
          .fontSize(7)
          .fillColor(TEXT_SECONDARY)
          .text(item.categoryName || "—", colX[1] + 4, currentY + 8, {
            width: colWidths[1] - 8,
          });

        doc
          .fontSize(7)
          .fillColor(TEXT_SECONDARY)
          .text(item.ipMac || "—", colX[2] + 4, currentY + 8, {
            width: colWidths[2] - 8,
          });

        // Action badge
        if (item.actionTypeName) {
          doc
            .fontSize(7)
            .font("Helvetica-Bold")
            .fillColor(item.actionTypeColor || TEXT_PRIMARY)
            .text(item.actionTypeName, colX[3] + 4, currentY + 8, {
              width: colWidths[3] - 8,
            });
        } else {
          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(TEXT_SECONDARY)
            .text("—", colX[3] + 4, currentY + 8);
        }

        // Observations (truncated)
        const obsText = item.observations
          ? item.observations.length > 80
            ? item.observations.substring(0, 80) + "..."
            : item.observations
          : "—";
        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(TEXT_SECONDARY)
          .text(obsText, colX[4] + 4, currentY + 8, {
            width: colWidths[4] - 8,
          });

        // Revisado: checkmark (path) verde o cruz (path) roja
        // Usamos paths en vez de Unicode porque Helvetica no soporta ✓/✗
        const revCx = colX[5] + colWidths[5] / 2;
        const revCy = currentY + rowHeight / 2;
        if (item.completed) {
          doc
            .moveTo(revCx - 5, revCy)
            .lineTo(revCx - 1, revCy + 5)
            .lineTo(revCx + 6, revCy - 4)
            .strokeColor(SUCCESS_COLOR)
            .lineWidth(2.5)
            .stroke();
        } else {
          doc
            .moveTo(revCx - 4, revCy - 4)
            .lineTo(revCx + 4, revCy + 4)
            .moveTo(revCx + 4, revCy - 4)
            .lineTo(revCx - 4, revCy + 4)
            .strokeColor("#dc2626")
            .lineWidth(2.5)
            .stroke();
        }

        // Bottom border
        doc
          .moveTo(50, currentY + rowHeight)
          .lineTo(50 + pageWidth, currentY + rowHeight)
          .strokeColor(BORDER_COLOR)
          .lineWidth(0.5)
          .stroke();

        currentY += rowHeight;
      });
    }

    currentY += 15;

    // ─── Photos Section ─────────────────────────────
    if (photos.length > 0) {
      // Check page break
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(BRAND_COLOR)
        .text("Fotografías", 50, currentY);

      currentY += 22;
      doc
        .moveTo(50, currentY)
        .lineTo(50 + pageWidth, currentY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(1)
        .stroke();

      currentY += 12;

      const photoWidth = (pageWidth - 20) / 3;
      const photoHeight = 80;
      const photoCellH = photoHeight + 25;

      // Track the bottom of the last row across pages
      let currentPhotoPageTop = currentY;
      let currentPhotoRow = 0;

      photos.forEach((photo, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 50 + col * (photoWidth + 10);
        const y = currentPhotoPageTop + (row - currentPhotoRow) * photoCellH;

        // Check page break — if this row doesn't fit, add a new page
        if (y + photoCellH > 750) {
          doc.addPage();
          currentPhotoPageTop = 50;
          currentPhotoRow = row;
          const placeY = 50;
          try {
            doc.image(photo.buffer, x, placeY, {
              width: photoWidth,
              height: photoHeight,
              fit: [photoWidth, photoHeight],
            });
          } catch {
            // Skip invalid image
          }
          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(TEXT_MUTED)
            .text(photo.caption, x, placeY + photoHeight + 4, {
              width: photoWidth,
              align: "center",
            });
          return;
        }

        try {
          doc.image(photo.buffer, x, y, {
            width: photoWidth,
            height: photoHeight,
            fit: [photoWidth, photoHeight],
          });
        } catch {
          // Skip invalid image
        }

        doc
          .fontSize(7)
          .font("Helvetica")
          .fillColor(TEXT_MUTED)
          .text(photo.caption, x, y + photoHeight + 4, {
            width: photoWidth,
            align: "center",
          });
      });

      // Calculate the actual Y after the last photo on the last page
      const maxPhotoRow = photos.length > 0
        ? Math.max(...photos.map((_, i) => Math.floor(i / 3)))
        : -1;
      if (maxPhotoRow >= 0) {
        const rowsOnLastPage = maxPhotoRow - currentPhotoRow + 1;
        currentY = currentPhotoPageTop + rowsOnLastPage * photoCellH + 10;
      }
    }

    // ─── Notes Section ──────────────────────────────
    if (maintenance.notes) {
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(BRAND_COLOR)
        .text("Observaciones Generales", 50, currentY);

      currentY += 22;
      doc
        .moveTo(50, currentY)
        .lineTo(50 + pageWidth, currentY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(1)
        .stroke();

      currentY += 12;

      // Notes box
      const notesBoxY = currentY;
      doc
        .rect(50, notesBoxY, pageWidth, 60)
        .fill("#fffbeb")
        .stroke("#fde68a");

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#92400e")
        .text(maintenance.notes, 60, notesBoxY + 10, {
          width: pageWidth - 20,
        });

      currentY = notesBoxY + 70;
    }

    // ─── Signatures Section ─────────────────────────
    if (technicianSignatureBuffer || clientSignatureBuffer) {
      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(BRAND_COLOR)
        .text("Firmas", 50, currentY);

      currentY += 22;
      doc
        .moveTo(50, currentY)
        .lineTo(50 + pageWidth, currentY)
        .strokeColor(BORDER_COLOR)
        .lineWidth(1)
        .stroke();

      currentY += 20;

      const sigWidth = 180;
      const sigHeight = 80;
      const sigSpacing = (pageWidth - sigWidth * 2) / 3;

      // Technician signature (left)
      const techSigX = 50 + sigSpacing;
      if (technicianSignatureBuffer) {
        try {
          doc.image(technicianSignatureBuffer, techSigX, currentY, {
            width: sigWidth,
            height: sigHeight,
            fit: [sigWidth, sigHeight],
          });
        } catch {
          // Skip invalid signature
        }
      }

      doc
        .moveTo(techSigX, currentY + sigHeight + 4)
        .lineTo(techSigX + sigWidth, currentY + sigHeight + 4)
        .strokeColor(TEXT_PRIMARY)
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(TEXT_SECONDARY)
        .text("Firma del Técnico", techSigX, currentY + sigHeight + 10, {
          width: sigWidth,
          align: "center",
        });

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(TEXT_PRIMARY)
        .text(maintenance.technician.fullName, techSigX, currentY + sigHeight + 24, {
          width: sigWidth,
          align: "center",
        });

      // Client signature (right)
      const clientSigX = techSigX + sigWidth + sigSpacing;
      if (clientSignatureBuffer) {
        try {
          doc.image(clientSignatureBuffer, clientSigX, currentY, {
            width: sigWidth,
            height: sigHeight,
            fit: [sigWidth, sigHeight],
          });
        } catch {
          // Skip invalid signature
        }
      }

      doc
        .moveTo(clientSigX, currentY + sigHeight + 4)
        .lineTo(clientSigX + sigWidth, currentY + sigHeight + 4)
        .strokeColor(TEXT_PRIMARY)
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(TEXT_SECONDARY)
        .text("Firma del Cliente", clientSigX, currentY + sigHeight + 10, {
          width: sigWidth,
          align: "center",
        });

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(TEXT_PRIMARY)
        .text(maintenance.client.name, clientSigX, currentY + sigHeight + 24, {
          width: sigWidth,
          align: "center",
        });
    }

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });

  const pdfStoragePath = `pdfs/${year}/${month}/${pdfFilename}`;

  // ─── Update DB ────────────────────────────────────
  await prisma.maintenance.update({
    where: { id: maintenanceId },
    data: {
      pdfPath: pdfStoragePath,
      pdfEngine: "pdfkit",
    },
  });

  return { pdfPath: pdfStoragePath, pdfEngine: "pdfkit" };
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
