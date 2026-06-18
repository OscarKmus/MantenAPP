import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { inventoryQuerySchema } from "./inventory.schema";
import { getInventory } from "./inventory.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import type { InventoryQueryInput } from "./inventory.schema";

export const inventoryRouter: IRouter = Router();

inventoryRouter.use(authMiddleware);

// GET /api/inventory?clientId=&categoryId=&status=&licenseType=&search=
inventoryRouter.get(
  "/inventory",
  validate(inventoryQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.query as unknown as InventoryQueryInput;
      const result = await getInventory(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
