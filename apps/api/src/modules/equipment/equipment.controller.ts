import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createEquipmentSchema, updateEquipmentSchema, equipmentQuerySchema } from "./equipment.schema";
import { listEquipment, getEquipment, createEquipment, updateEquipment, deleteEquipment } from "./equipment.service";
import { validate } from "../../middleware/validate";
import { authMiddleware, requireRole, requireOwnershipOrAdmin } from "../../middleware/auth";
import prisma from "../../lib/prisma";
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
      const equipment = await createEquipment(clientId, req.body, req.user!.userId);
      res.status(201).json({ equipment });
    } catch (error) {
      next(error);
    }
  }
);

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
  requireOwnershipOrAdmin(async (req) => {
    const id = getParam(req.params.id);
    const e = await prisma.equipment.findUnique({ where: { id }, select: { createdById: true } });
    return e?.createdById ?? null;
  }),
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
equipmentRouter.delete("/equipment/:id", requireRole("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getParam(req.params.id);
    await deleteEquipment(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
