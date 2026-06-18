import { z } from "zod";

const licenseTypeEnum = z.enum([
  "OFFICE",
  "NORTON",
  "PDF",
  "AUTOCAD",
  "ANTIVIRUS",
  "OTHER",
]);

export const createSoftwareSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  licenseType: licenseTypeEnum,
  clientId: z.string().uuid("Invalid client ID"),
  equipmentId: z.string().uuid("Invalid equipment ID").nullable().optional(),
  expiresAt: z.string().datetime("Invalid date format"),
  notes: z.string().max(500).optional(),
});

export const updateSoftwareSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  licenseType: licenseTypeEnum.optional(),
  equipmentId: z.string().uuid("Invalid equipment ID").nullable().optional(),
  expiresAt: z.string().datetime("Invalid date format").optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const softwareQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  licenseType: licenseTypeEnum.optional(),
});

export type CreateSoftwareInput = z.infer<typeof createSoftwareSchema>;
export type UpdateSoftwareInput = z.infer<typeof updateSoftwareSchema>;
