import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Express 5 makes req.query a getter-only property; we can't reassign it.
      // Mutate the existing object in place so downstream handlers see the parsed shape.
      if (source === "query") {
        Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
        Object.assign(req.query, parsed);
      } else {
        // req.body and req.params remain reassignable in Express 5.
        (req as unknown as Record<RequestPart, unknown>)[source] = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
