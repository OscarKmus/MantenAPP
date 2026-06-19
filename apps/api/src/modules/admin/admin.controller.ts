import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { verifySchema } from "./admin.schema";
import { verifyPassword, signAdminToken } from "./admin.service";
import { verifyLimiter } from "./admin.limiter";
import { validate } from "../../middleware/validate";

export const adminRouter: IRouter = Router();

// POST /api/admin/verify — authenticate with admin password, receive short-lived JWT
adminRouter.post(
  "/verify",
  verifyLimiter,
  validate(verifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body;
      const ip = req.ip ?? "unknown";
      const timestamp = new Date().toISOString();

      if (!verifyPassword(password)) {
        console.log(`[admin-verify] FAILED — ${timestamp} — IP: ${ip}`);
        res.status(401).json({ ok: false, error: "invalid_password" });
        return;
      }

      const token = signAdminToken();

      console.log(`[admin-verify] SUCCESS — ${timestamp} — IP: ${ip}`);
      res.status(200).json({ ok: true, token, expiresIn: 300 });
    } catch (error) {
      next(error);
    }
  }
);
