import { z } from "zod";

const licenseTypeEnum = z.enum([
  "OFFICE",
  "NORTON",
  "PDF",
  "AUTOCAD",
  "ANTIVIRUS",
  "OTHER",
]);

// Accept ISO 8601 datetime OR plain YYYY-MM-DD
const flexibleDate = z.string().refine((v) => !isNaN(Date.parse(v)), {
  message: "Invalid date (expected YYYY-MM-DD or ISO 8601)",
});

export const createSoftwareSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  licenseType: licenseTypeEnum,
  clientId: z.string().uuid("Invalid client ID"),
  equipmentId: z.string().uuid("Invalid equipment ID").nullable().optional(),
  expiresAt: flexibleDate,
  notes: z.string().max(500).nullable().optional(),
});

export const updateSoftwareSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  licenseType: licenseTypeEnum.optional(),
  equipmentId: z.string().uuid("Invalid equipment ID").nullable().optional(),
  expiresAt: flexibleDate.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const softwareQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  licenseType: licenseTypeEnum.optional(),
});

export type CreateSoftwareInput = z.infer<typeof createSoftwareSchema>;
export type UpdateSoftwareInput = z.infer<typeof updateSoftwareSchema>;
