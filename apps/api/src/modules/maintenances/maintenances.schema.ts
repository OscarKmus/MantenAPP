import { z } from "zod";

export const createMaintenanceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  equipmentIds: z.array(z.string().uuid()).min(1, "At least one equipment item is required"),
  templateId: z.string().uuid().optional(),
});

export const updateMaintenanceSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "CLOSED"]).optional(),
});

export const updateMaintenanceItemSchema = z.object({
  actionTypeId: z.string().uuid().nullable().optional(),
  observations: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
});

export const closeMaintenanceSchema = z.object({
  clientSignatureData: z
    .string()
    .min(1, "Client signature is required")
    .refine(
      (val) => val.startsWith("data:image/png;base64,") || val.startsWith("data:image/jpeg;base64,"),
      "Client signature must be a base64 PNG or JPEG data URL"
    ),
  technicianSignatureData: z
    .string()
    .min(1, "Technician signature is required")
    .refine(
      (val) => val.startsWith("data:image/png;base64,") || val.startsWith("data:image/jpeg;base64,"),
      "Technician signature must be a base64 PNG or JPEG data URL"
    ),
});

export const maintenanceQuerySchema = z.object({
  status: z.enum(["DRAFT", "IN_PROGRESS", "CLOSED"]).optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;
export type UpdateMaintenanceItemInput = z.infer<typeof updateMaintenanceItemSchema>;
export type CloseMaintenanceInput = z.infer<typeof closeMaintenanceSchema>;
