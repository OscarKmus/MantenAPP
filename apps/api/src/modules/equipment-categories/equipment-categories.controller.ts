import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createCategorySchema, updateCategorySchema } from "./equipment-categories.schema";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./equipment-categories.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const equipmentCategoriesRouter: IRouter = Router();

equipmentCategoriesRouter.use(authMiddleware);

// GET /api/equipment-categories
equipmentCategoriesRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// POST /api/equipment-categories
equipmentCategoriesRouter.post(
  "/",
  validate(createCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await createCategory(req.body);
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/equipment-categories/:id
equipmentCategoriesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await getCategory(id);
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/equipment-categories/:id
equipmentCategoriesRouter.patch(
  "/:id",
  validate(updateCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const category = await updateCategory(id, req.body);
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/equipment-categories/:id
equipmentCategoriesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
