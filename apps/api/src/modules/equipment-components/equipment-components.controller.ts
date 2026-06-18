import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createComponentSchema, updateComponentSchema } from "./equipment-components.schema";
import {
  listComponents,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
} from "./equipment-components.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const equipmentComponentsRouter: IRouter = Router();

equipmentComponentsRouter.use(authMiddleware);

// GET /api/equipment/:equipmentId/components
equipmentComponentsRouter.get(
  "/equipment/:equipmentId/components",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipmentId = Array.isArray(req.params.equipmentId)
        ? req.params.equipmentId[0]
        : req.params.equipmentId;
      const components = await listComponents(equipmentId);
      res.json({ components });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/equipment/:equipmentId/components
equipmentComponentsRouter.post(
  "/equipment/:equipmentId/components",
  validate(createComponentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const equipmentId = Array.isArray(req.params.equipmentId)
        ? req.params.equipmentId[0]
        : req.params.equipmentId;
      const component = await createComponent(equipmentId, req.body);
      res.status(201).json({ component });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/components/:id
equipmentComponentsRouter.get(
  "/components/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const component = await getComponent(id);
      res.json({ component });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/components/:id
equipmentComponentsRouter.patch(
  "/components/:id",
  validate(updateComponentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const component = await updateComponent(id, req.body);
      res.json({ component });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/components/:id
equipmentComponentsRouter.delete(
  "/components/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await deleteComponent(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
