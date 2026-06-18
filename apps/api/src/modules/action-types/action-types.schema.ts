import { z } from "zod";

export const createActionTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color (e.g. #ff0000)").optional(),
  icon: z.string().max(50).optional(),
});

export const updateActionTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type CreateActionTypeInput = z.infer<typeof createActionTypeSchema>;
export type UpdateActionTypeInput = z.infer<typeof updateActionTypeSchema>;
