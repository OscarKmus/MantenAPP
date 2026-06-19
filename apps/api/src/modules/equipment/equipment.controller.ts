import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createEquipmentSchema, updateEquipmentSchema, equipmentQuerySchema, bulkDeleteSchema, cascadePreviewSchema } from "./equipment.schema";
import { listEquipment, getEquipment, createEquipment, updateEquipment, deleteEquipment, cascadePreviewEquipment, bulkDeleteEquipment } from "./equipment.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import { requireAdminToken } from "../admin/admin.middleware";
import type { EquipmentStatus } from "@mantenti/types";

export const equipmentRouter: IRouter = Router();

// All routes require auth
equipmentRouter.use(authMiddleware);

// Helper to safely extract param
function getParam(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// GET /api/clients/:clientId/equipment?status=
equipmentRouter.get(
  "/clients/:clientId/equipment",
  validate(equipmentQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getParam(req.params.clientId);
      const { status } = req.query as { status?: EquipmentStatus };
      const equipment = await listEquipment(clientId, status);
      res.json({ equipment });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/clients/:clientId/equipment
equipmentRouter.post(
  "/clients/:clientId/equipment",
  validate(createEquipmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getParam(req.params.clientId);
      const equipment = await createEquipment(clientId, req.body);
      res.status(201).json({ equipment });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/equipment/cascade-preview — preview cascade counts (user JWT only, no admin token)
equipmentRouter.post("/equipment/cascade-preview", validate(cascadePreviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const counts = await cascadePreviewEquipment(ids);
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment/bulk-delete — bulk delete with admin token (all-or-nothing)
equipmentRouter.post("/equipment/bulk-delete", requireAdminToken, validate(bulkDeleteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body as { ids: string[] };
    const result = await bulkDeleteEquipment(ids);

    if (result.skipped && result.skipped.length > 0) {
      // Some ids didn't exist — return 207 with partial result
      res.status(207).json(result);
      return;
    }

    res.json({ deleted: result.deleted, ids: result.ids });
  } catch (error) {
    next(error);
  }
});

// GET /api/equipment/:id
equipmentRouter.get("/equipment/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    const equipment = await getEquipment(id);
    res.json({ equipment });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/equipment/:id
equipmentRouter.patch(
  "/equipment/:id",
  validate(updateEquipmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const equipment = await updateEquipment(id, req.body);
      res.json({ equipment });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/equipment/:id
equipmentRouter.delete("/equipment/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    await deleteEquipment(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
