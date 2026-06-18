import { z } from "zod";

const componentTypeEnum = z.enum([
  "RAM",
  "CPU",
  "DISK",
  "GPU",
  "PSU",
  "MOTHERBOARD",
  "OTHER",
]);

export const createComponentSchema = z.object({
  type: componentTypeEnum,
  name: z.string().min(1, "Name is required").max(100),
  specs: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateComponentSchema = z.object({
  type: componentTypeEnum.optional(),
  name: z.string().min(1).max(100).optional(),
  specs: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
