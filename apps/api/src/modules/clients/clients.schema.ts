import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  location: z.string().max(500).optional(),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(200).optional(),
  frequencyDays: z.number().int().min(1).max(3650).optional(),
}).strict();

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().max(500).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactEmail: z.string().email().max(200).nullable().optional(),
  frequencyDays: z.number().int().min(1).max(3650).nullable().optional(),
  nextMaintenanceAgreedAt: z.string().datetime().nullable().optional(),
  nextMaintenanceAt: z.string().datetime().nullable().optional(),
}).strict();

export const clientQuerySchema = z.object({
  q: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
