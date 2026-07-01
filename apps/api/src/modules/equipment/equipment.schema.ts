import { z } from "zod";

const equipmentStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "DECOMMISSIONED",
]);

// Helper: optional string that accepts undefined, null, or empty string.
// When a value is present, validates it with the provided check.
const optionalString = (max: number, check?: (v: string) => boolean, errMsg?: string) => {
  const base = z.union([z.string().max(max), z.literal(""), z.null()]).optional();
  if (!check) return base;
  return base.refine(
    (v) => v === undefined || v === null || v === "" || check(v as string),
    { message: errMsg ?? "Invalid value" }
  );
};

const optionalIp = optionalString(
  45,
  (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v),
  "Invalid IP format (expected x.x.x.x)"
);

const optionalMac = optionalString(
  17,
  (v) => /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(v),
  "Invalid MAC format (expected xx:xx:xx:xx:xx:xx)"
);

export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  ip: optionalIp,
  mac: optionalMac,
  serial: optionalString(100),
  assignedTo: optionalString(200),
  status: equipmentStatusEnum.optional(),
  categoryId: z.string().uuid().nullable().optional(),
  softwareId: z.string().uuid().nullable().optional(),
  processor: optionalString(200),
  ram: optionalString(200),
  disk: optionalString(200),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ip: optionalIp,
  mac: optionalMac,
  serial: optionalString(100),
  assignedTo: optionalString(200),
  status: equipmentStatusEnum.optional(),
  categoryId: z.string().uuid().nullable().optional(),
  softwareId: z.string().uuid().nullable().optional(),
  processor: optionalString(200),
  ram: optionalString(200),
  disk: optionalString(200),
});

export const equipmentQuerySchema = z.object({
  status: equipmentStatusEnum.optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one id is required").max(100, "Maximum 100 ids per batch"),
});

export const cascadePreviewSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one id is required").max(100, "Maximum 100 ids per batch"),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type CascadePreviewInput = z.infer<typeof cascadePreviewSchema>;
