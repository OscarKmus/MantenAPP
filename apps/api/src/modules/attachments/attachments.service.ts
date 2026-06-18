import prisma from "../../lib/prisma";
import { createError } from "../../middleware/error-handler";
import { localStorage } from "../../services/storage/local.provider";
import type { AttachmentScope } from "@mantenti/types";

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max photos per maintenance (across all items + general)
const MAX_PHOTOS_PER_MAINTENANCE = 20;

// Map MIME type to file extension
function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[mimeType] ?? "bin";
}

export interface UploadAttachmentInput {
  scope: AttachmentScope;
  parentId: string;
  file: Express.Multer.File;
}

export async function uploadAttachment(input: UploadAttachmentInput) {
  const { scope, parentId, file } = input;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw createError(400, `File type not allowed: ${file.mimetype}. Allowed: JPEG, PNG, WebP, HEIC`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw createError(400, `File exceeds 10MB limit (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  // Validate parent exists
  if (scope === "MAINTENANCE") {
    const maintenance = await prisma.maintenance.findUnique({ where: { id: parentId } });
    if (!maintenance) {
      throw createError(404, "Maintenance not found");
    }
    if (maintenance.status === "CLOSED") {
      throw createError(403, "Cannot add attachments to a closed maintenance");
    }
  } else if (scope === "MAINTENANCE_ITEM") {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: parentId },
      include: { maintenance: true },
    });
    if (!item) {
      throw createError(404, "Maintenance item not found");
    }
    if (item.maintenance.status === "CLOSED") {
      throw createError(403, "Cannot add attachments to a closed maintenance");
    }
  }

  // Count existing attachments for this maintenance (all scopes)
  const maintenanceId = scope === "MAINTENANCE"
    ? parentId
    : (await prisma.maintenanceItem.findUnique({ where: { id: parentId } }))?.maintenanceId;

  if (maintenanceId) {
    const existingItems = await prisma.maintenanceItem.findMany({
      where: { maintenanceId },
      select: { id: true },
    });
    const itemIds = existingItems.map((i) => i.id);

    const count = await prisma.attachment.count({
      where: {
        OR: [
          { scope: "MAINTENANCE", parentId: maintenanceId },
          { scope: "MAINTENANCE_ITEM", parentId: { in: itemIds } },
        ],
      },
    });

    if (count >= MAX_PHOTOS_PER_MAINTENANCE) {
      throw createError(400, `Maximum ${MAX_PHOTOS_PER_MAINTENANCE} photos per maintenance`);
    }
  }

  // Store file
  const ext = mimeToExt(file.mimetype);
  const result = await localStorage.put(file.buffer, file.mimetype, ext);

  // Create attachment record
  const attachment = await prisma.attachment.create({
    data: {
      scope,
      parentId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: result.storagePath,
    },
  });

  return attachment;
}

export async function deleteAttachment(id: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    throw createError(404, "Attachment not found");
  }

  // Check if parent maintenance is closed
  if (attachment.scope === "MAINTENANCE") {
    const maintenance = await prisma.maintenance.findUnique({ where: { id: attachment.parentId } });
    if (maintenance?.status === "CLOSED") {
      throw createError(403, "Cannot delete attachments from a closed maintenance");
    }
  } else {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: attachment.parentId },
      include: { maintenance: true },
    });
    if (item?.maintenance.status === "CLOSED") {
      throw createError(403, "Cannot delete attachments from a closed maintenance");
    }
  }

  // Delete file from storage
  await localStorage.delete(attachment.storagePath);

  // Delete record
  await prisma.attachment.delete({ where: { id } });
}

export async function getAttachment(id: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    throw createError(404, "Attachment not found");
  }
  return attachment;
}

export async function listAttachments(maintenanceId: string) {
  // Get all items for this maintenance
  const items = await prisma.maintenanceItem.findMany({
    where: { maintenanceId },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  return prisma.attachment.findMany({
    where: {
      OR: [
        { scope: "MAINTENANCE", parentId: maintenanceId },
        { scope: "MAINTENANCE_ITEM", parentId: { in: itemIds } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}
