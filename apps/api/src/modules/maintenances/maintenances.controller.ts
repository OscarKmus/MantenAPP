import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  updateMaintenanceItemSchema,
  closeMaintenanceSchema,
  maintenanceQuerySchema,
} from "./maintenances.schema";
import {
  createMaintenance,
  getMaintenance,
  updateMaintenance,
  updateMaintenanceItem,
  removeMaintenanceItem,
  closeMaintenance,
  listClientMaintenances,
} from "./maintenances.service";
import {
  getMaintenancePdfPath,
  regenerateMaintenancePdf,
} from "../../services/pdf/pdf.service";
import { validate } from "../../middleware/validate";
import { authMiddleware, requireRole, requireOwnershipOrAdmin } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const maintenancesRouter: IRouter = Router();

// All routes require auth
maintenancesRouter.use(authMiddleware);

// Helper to safely extract param
function getParam(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// POST /api/maintenances
maintenancesRouter.post(
  "/",
  validate(createMaintenanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maintenance = await createMaintenance(req.user!.userId, req.body);
      res.status(201).json({ maintenance });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/maintenances/:id
maintenancesRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const result = await getMaintenance(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/maintenances/:id
maintenancesRouter.patch(
  "/:id",
  validate(updateMaintenanceSchema),
  requireOwnershipOrAdmin(async (req) => {
    const id = getParam(req.params.id);
    const m = await prisma.maintenance.findUnique({ where: { id }, select: { technicianId: true } });
    return m?.technicianId ?? null;
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const maintenance = await updateMaintenance(id, req.body);
      res.json({ maintenance });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/maintenances/:id/items/:itemId
maintenancesRouter.patch(
  "/:id/items/:itemId",
  validate(updateMaintenanceItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maintenanceId = getParam(req.params.id);
      const itemId = getParam(req.params.itemId);
      const item = await updateMaintenanceItem(maintenanceId, itemId, req.body);
      res.json({ item });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/maintenances/:id/items/:itemId
maintenancesRouter.delete(
  "/:id/items/:itemId",
  requireRole("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maintenanceId = getParam(req.params.id);
      const itemId = getParam(req.params.itemId);
      await removeMaintenanceItem(maintenanceId, itemId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/maintenances/:id/close
maintenancesRouter.post(
  "/:id/close",
  validate(closeMaintenanceSchema),
  requireOwnershipOrAdmin(async (req) => {
    const id = getParam(req.params.id);
    const m = await prisma.maintenance.findUnique({ where: { id }, select: { technicianId: true } });
    return m?.technicianId ?? null;
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const maintenance = await closeMaintenance(id, req.body);

      // Trigger PDF generation (sync for dev simplicity)
      let pdfPath: string | null = null;
      try {
        const result = await regenerateMaintenancePdf(id);
        pdfPath = result.pdfPath;
      } catch (pdfErr) {
        console.error("PDF generation failed on close:", pdfErr);
        // Don't fail the close if PDF generation fails
      }

      res.json({
        maintenance,
        pdfPath,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/maintenances/:id/pdf — download the generated PDF
maintenancesRouter.get(
  "/:id/pdf",
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const filePath = await getMaintenancePdfPath(id);
      const filename = `mantencion-${id.substring(0, 8)}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.sendFile(filePath);
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  }
);

// POST /api/maintenances/:id/pdf/regenerate — force PDF regeneration
maintenancesRouter.post(
  "/:id/pdf/regenerate",
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const result = await regenerateMaintenancePdf(id);
      res.json({
        pdfPath: result.pdfPath,
        pdfEngine: result.pdfEngine,
      });
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({ error: error.message });
    }
  }
);

// GET /api/maintenances/client/:clientId — list maintenances for a client
maintenancesRouter.get(
  "/client/:clientId",
  validate(maintenanceQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getParam(req.params.clientId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await listClientMaintenances(clientId, page, limit, undefined);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
