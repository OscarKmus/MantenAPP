import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
}

export function createError(statusCode: number, message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  if (code) {
    error.code = code;
  }
  return error;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(401).json({ error: "Token expired" });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const appError = err as AppError;
  const statusCode = appError.statusCode || 500;
  const message = appError.isOperational ? appError.message : "Internal server error";

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  // Use nested shape when code is present (RBAC errors), flat shape otherwise (legacy)
  if (appError.code) {
    res.status(statusCode).json({ error: { code: appError.code, message } });
  } else {
    res.status(statusCode).json({ error: message });
  }
}
