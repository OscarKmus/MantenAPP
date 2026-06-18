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
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const maintenance = await closeMaintenance(id, req.body);
      res.json({
        maintenance,
        pdfPath: null, // TODO: Slice 4 — PDF generation
      });
    } catch (error) {
      next(error);
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
      const result = await listClientMaintenances(clientId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
