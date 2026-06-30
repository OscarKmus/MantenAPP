import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken } from "../modules/auth/auth.service";
import type { UserRole } from "@mantenti/types";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware factory: restrict access to specific roles.
 * Uses nested error shape { error: { code, message } } for RBAC errors.
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: allow ADMIN or check resource ownership.
 * getOwnerId returns the owner's userId for the resource, or null if not found.
 * Uses nested error shape { error: { code, message } } for RBAC errors.
 */
export function requireOwnershipOrAdmin(
  getOwnerId: (req: Request) => Promise<string | null>
): RequestHandler {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
      return;
    }

    // ADMIN passes
    if (req.user.role === "ADMIN") {
      next();
      return;
    }

    // USER: check ownership
    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
        return;
      }

      if (ownerId !== req.user.userId) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "You can only edit your own records" } });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
