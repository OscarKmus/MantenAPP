import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { listNotificationsQuerySchema } from "./notifications.schema";
import { listForUser, markRead, markAllRead } from "./notifications.service";
import { getForUser, setEnabled } from "./preferences.service";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import { createError } from "../../middleware/error-handler";

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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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

// GET /api/notifications/preferences
notificationsRouter.get(
  "/preferences",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const preferences = await getForUser(userId);
      res.json({ preferences });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/notifications/preferences
notificationsRouter.patch(
  "/preferences",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { channel, enabled } = req.body as { channel?: string; enabled?: boolean };

      if (!channel || typeof enabled !== "boolean") {
        throw createError(400, "channel (string) and enabled (boolean) are required");
      }

      const validChannels = ["INAPP", "PUSH", "EMAIL"];
      if (!validChannels.includes(channel)) {
        throw createError(400, `channel must be one of: ${validChannels.join(", ")}`);
      }

      const preference = await setEnabled(userId, channel as "INAPP" | "PUSH" | "EMAIL", enabled);
      res.json({ preference });
    } catch (error) {
      next(error);
    }
  }
);
