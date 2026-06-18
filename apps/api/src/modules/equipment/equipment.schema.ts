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

// Optional date string: accepts ISO datetime ("2027-12-31T00:00:00Z") or plain date ("2027-12-31").
const optionalDateString = optionalString(50, (v) => {
  // Try Date.parse
  const t = Date.parse(v);
  return !isNaN(t);
}, "Invalid date (expected YYYY-MM-DD or ISO 8601)");

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
});

export const equipmentQuerySchema = z.object({
  status: equipmentStatusEnum.optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
