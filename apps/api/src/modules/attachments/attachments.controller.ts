import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { uploadAttachment, deleteAttachment, getAttachment, listAttachments } from "./attachments.service";
import { authMiddleware } from "../../middleware/auth";
import { localStorage } from "../../services/storage/local.provider";
import { createError } from "../../middleware/error-handler";
import * as path from "path";

export const attachmentsRouter: IRouter = Router();

// Multer setup: memory storage, 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All routes require auth
attachmentsRouter.use(authMiddleware);

// Helper to safely extract param
function getParam(val: string | string[]): string {
  if (Array.isArray(val)) {
    // path-to-regexp v8: *name returns an array of path segments; join them.
    return val.join("/");
  }
  return val;
}

// POST /api/maintenances/:id/attachments — upload to maintenance scope
attachmentsRouter.post(
  "/maintenances/:id/attachments",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maintenanceId = getParam(req.params.id);
      if (!req.file) {
        throw createError(400, "No file provided");
      }

      const attachment = await uploadAttachment({
        scope: "MAINTENANCE",
        parentId: maintenanceId,
        file: req.file,
      });

      res.status(201).json({ attachment });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/maintenances/:id/items/:itemId/attachments — upload to item scope
attachmentsRouter.post(
  "/maintenances/:id/items/:itemId/attachments",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemId = getParam(req.params.itemId);
      if (!req.file) {
        throw createError(400, "No file provided");
      }

      const attachment = await uploadAttachment({
        scope: "MAINTENANCE_ITEM",
        parentId: itemId,
        file: req.file,
      });

      res.status(201).json({ attachment });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/maintenances/:id/attachments — list all attachments
attachmentsRouter.get(
  "/maintenances/:id/attachments",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maintenanceId = getParam(req.params.id);
      const attachments = await listAttachments(maintenanceId);
      res.json({ attachments });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/attachments/:id
attachmentsRouter.delete(
  "/attachments/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      await deleteAttachment(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/files/*path — serve stored files (with path traversal protection)
// Express 5 (path-to-regexp v8) uses *name syntax for wildcards (was :path(*) in Express 4).
attachmentsRouter.get(
  "/files/*path",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Express 5 *path includes the leading slash; strip it so resolvePath doesn't treat it as absolute on Windows.
      const rawPath = getParam(req.params.path);
      const storagePath = rawPath.replace(/^\/+/, "");

      // Resolve and validate path (LocalStorageProvider has traversal protection)
      let fullPath: string;
      try {
        fullPath = localStorage.resolvePath(storagePath);
      } catch {
        throw createError(400, "Invalid file path");
      }

      // Check file exists
      const exists = await localStorage.exists(storagePath);
      if (!exists) {
        throw createError(404, "File not found");
      }

      // Get the attachment record for MIME type
      const attachment = await getAttachmentByPath(storagePath);

      // Stream the file
      const stream = await localStorage.getReadStream(storagePath);
      res.setHeader("Content-Type", attachment?.mimeType ?? "application/octet-stream");
      res.setHeader("Content-Length", String(require("fs").statSync(localStorage.resolvePath(storagePath)).size));
      res.setHeader("Cache-Control", "public, max-age=31536000");

      // Handle stream errors so a client disconnect doesn't crash the process
      stream.on("error", (err) => {
        console.error("[files] stream error:", err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to read file" });
        } else {
          res.end();
        }
      });
      res.on("close", () => {
        // Client disconnected — destroy the stream so we don't keep reading
        if (!res.writableEnded) {
          // The LocalStorage.getReadStream returns a Node Readable; cast for destroy().
          (stream as unknown as { destroy?: () => void }).destroy?.();
        }
      });

      // Node.js streams
      if (stream instanceof require("fs").ReadStream) {
        stream.pipe(res);
      } else {
        // For other stream types, collect and send
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          if (!res.writableEnded) {
            chunks.push(Buffer.from(chunk));
          } else {
            break;
          }
        }
        if (!res.writableEnded) {
          res.send(Buffer.concat(chunks));
        }
      }
    } catch (error) {
      next(error);
    }
  }
);

// Helper: find attachment by storage path
async function getAttachmentByPath(storagePath: string) {
  return require("../../lib/prisma").default.attachment.findFirst({
    where: { storagePath },
  });
}
