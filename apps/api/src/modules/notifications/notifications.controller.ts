import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { listNotificationsQuerySchema } from "./notifications.schema";
import { listForUser, markRead, markAllRead } from "./notifications.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";

export const notificationsRouter: IRouter = Router();

// All routes require auth
notificationsRouter.use(authMiddleware);

// GET /api/notifications
notificationsRouter.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const params = req.query as unknown as { unreadOnly?: boolean; page: number; limit: number };
      const result = await listForUser(userId, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/notifications/:id/read
notificationsRouter.patch(
  "/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const notification = await markRead(id, userId);

      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      res.json({ notification });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/notifications/read-all
notificationsRouter.post(
  "/read-all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const count = await markAllRead(userId);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
);
