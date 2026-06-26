import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "../../modules/notifications/notifications.schema";
import { validate } from "../../middleware/validate";
import { authMiddleware } from "../../middleware/auth";
import prisma from "../../lib/prisma";
import { listSubscriptions, removeSubscription } from "./push.service";

export const pushRouter: IRouter = Router();

// All routes require auth
pushRouter.use(authMiddleware);

// POST /api/push/subscribe
pushRouter.post(
  "/subscribe",
  validate(pushSubscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { endpoint, keys } = req.body;

      // Upsert: if endpoint already exists for this user, update keys
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        update: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/push/unsubscribe
pushRouter.post(
  "/unsubscribe",
  validate(pushUnsubscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endpoint } = req.body;

      const deleted = await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });

      if (deleted.count === 0) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/push/subscriptions
pushRouter.get(
  "/subscriptions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const subscriptions = await listSubscriptions(userId);
      res.json({ subscriptions });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/push/subscriptions/:endpoint
// The `:endpoint` path param is the full push subscription endpoint URL,
// which is URL-encoded by the client (axios uses `encodeURIComponent`).
// Express decodes the path segment once when reading `req.params`, so we
// call `decodeURIComponent` defensively in case the value was double-encoded
// or arrived with raw special characters. The decoded value is then matched
// exactly against the stored `endpoint` column (a unique key in the schema).
pushRouter.delete(
  "/subscriptions/:endpoint",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const rawEndpoint = Array.isArray(req.params.endpoint) ? req.params.endpoint[0] : req.params.endpoint;
      const endpoint = decodeURIComponent(rawEndpoint);

      const removed = await removeSubscription(userId, endpoint);
      if (!removed) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
