import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createActionTypeSchema, updateActionTypeSchema } from "./action-types.schema";
import { listActionTypes, getActionType, createActionType, updateActionType, deleteActionType } from "./action-types.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const actionTypesRouter: IRouter = Router();

// All routes require auth
actionTypesRouter.use(authMiddleware);

// GET /api/action-types
actionTypesRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const actionTypes = await listActionTypes();
    res.json({ actionTypes });
  } catch (error) {
    next(error);
  }
});

// POST /api/action-types
actionTypesRouter.post("/", validate(createActionTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actionType = await createActionType(req.body);
    res.status(201).json({ actionType });
  } catch (error) {
    next(error);
  }
});

// GET /api/action-types/:id
actionTypesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actionType = await getActionType(id);
    res.json({ actionType });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/action-types/:id
actionTypesRouter.patch("/:id", validate(updateActionTypeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actionType = await updateActionType(id, req.body);
    res.json({ actionType });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/action-types/:id
actionTypesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteActionType(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
