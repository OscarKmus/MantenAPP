import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createSoftwareSchema, updateSoftwareSchema, softwareQuerySchema } from "./software.schema";
import {
  listSoftware,
  getSoftware,
  createSoftware,
  updateSoftware,
  deleteSoftware,
  listSoftwareByClient,
  listSoftwareByEquipment,
} from "./software.service";
import { validate } from "../../middleware/validate";
import { authMiddleware, requireRole, requireOwnershipOrAdmin } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import type { LicenseType } from "@mantenti/types";

export const softwareRouter: IRouter = Router();

softwareRouter.use(authMiddleware);

// GET /api/software?clientId=&equipmentId=&licenseType=
softwareRouter.get(
  "/software",
  validate(softwareQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, equipmentId, licenseType } = req.query as {
        clientId?: string;
        equipmentId?: string;
        licenseType?: LicenseType;
      };
      const software = await listSoftware({ clientId, equipmentId, licenseType });
      res.json({ software });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/software
softwareRouter.post(
  "/software",
  validate(createSoftwareSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const software = await createSoftware(req.body, req.user!.userId);
      res.status(201).json({ software });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/software/:id
softwareRouter.get("/software/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const software = await getSoftware(id);
    res.json({ software });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/software/:id
softwareRouter.patch(
  "/software/:id",
  validate(updateSoftwareSchema),
  requireOwnershipOrAdmin(async (req) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const s = await prisma.software.findUnique({ where: { id }, select: { createdById: true } });
    return s?.createdById ?? null;
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const software = await updateSoftware(id, req.body);
      res.json({ software });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/software/:id
softwareRouter.delete("/software/:id", requireRole("ADMIN"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteSoftware(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:clientId/software
softwareRouter.get(
  "/clients/:clientId/software",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = Array.isArray(req.params.clientId)
        ? req.params.clientId[0]
        : req.params.clientId;
      const software = await listSoftwareByClient(clientId);
      res.json({ software });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/equipment/:equipmentId/software
softwareRouter.get(
  "/equipment/:equipmentId/software",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipmentId = Array.isArray(req.params.equipmentId)
        ? req.params.equipmentId[0]
        : req.params.equipmentId;
      const software = await listSoftwareByEquipment(equipmentId);
      res.json({ software });
    } catch (error) {
      next(error);
    }
  }
);
