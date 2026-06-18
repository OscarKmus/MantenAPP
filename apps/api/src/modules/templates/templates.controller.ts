import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createTemplateSchema, updateTemplateSchema } from "./templates.schema";
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, useTemplate } from "./templates.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const templatesRouter: IRouter = Router();

// All routes require auth
templatesRouter.use(authMiddleware);

// Helper to safely extract param
function getParam(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

// GET /api/clients/:clientId/templates
templatesRouter.get(
  "/clients/:clientId/templates",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getParam(req.params.clientId);
      const templates = await listTemplates(clientId);
      res.json({ templates });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/clients/:clientId/templates
templatesRouter.post(
  "/clients/:clientId/templates",
  validate(createTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getParam(req.params.clientId);
      const template = await createTemplate(clientId, req.body);
      res.status(201).json({ template });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/templates/:id
templatesRouter.get(
  "/templates/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const template = await getTemplate(id);
      res.json({ template });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/templates/:id
templatesRouter.patch(
  "/templates/:id",
  validate(updateTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const template = await updateTemplate(id, req.body);
      res.json({ template });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/templates/:id
templatesRouter.delete(
  "/templates/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      await deleteTemplate(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/templates/:id/use
templatesRouter.post(
  "/templates/:id/use",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params.id);
      const result = await useTemplate(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
