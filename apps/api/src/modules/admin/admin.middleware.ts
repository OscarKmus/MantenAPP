import type { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { verifyAdminToken } from "./admin.service";

// Extend Express Request type for admin token
declare global {
  namespace Express {
    interface Request {
      adminToken?: {
        valid: true;
        exp: number;
      };
    }
  }
}

/**
 * Middleware that validates an admin JWT from the Authorization header.
 * Expects: Authorization: Bearer <token>
 *
 * On success: attaches req.adminToken = { valid: true, exp }
 * On failure: responds 401 with admin_token_invalid or admin_token_expired
 */
export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "admin_token_invalid" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAdminToken(token);
    req.adminToken = { valid: true, exp: payload.exp };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({ error: "admin_token_expired" });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({ error: "admin_token_invalid" });
      return;
    }

    next(error);
  }
}
