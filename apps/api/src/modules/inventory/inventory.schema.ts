import { z } from "zod";

export const inventoryQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "DECOMMISSIONED"]).optional(),
  licenseType: z.enum(["OFFICE", "NORTON", "PDF", "AUTOCAD", "ANTIVIRUS", "OTHER"]).optional(),
  search: z.string().max(100).optional(),
});

export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
