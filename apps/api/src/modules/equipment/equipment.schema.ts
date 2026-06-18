import { z } from "zod";

const equipmentStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "UNDER_MAINTENANCE",
  "DECOMMISSIONED",
]);

export const createEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  ip: z
    .string()
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}$/,
      "Invalid IP format (expected x.x.x.x)"
    )
    .max(45)
    .optional()
    .or(z.literal("")),
  mac: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,
      "Invalid MAC format (expected xx:xx:xx:xx:xx:xx)"
    )
    .max(17)
    .optional()
    .or(z.literal("")),
  serial: z.string().max(100).optional(),
  assignedTo: z.string().max(200).optional(),
  status: equipmentStatusEnum.optional(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ip: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP format")
    .max(45)
    .nullable()
    .optional(),
  mac: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, "Invalid MAC format")
    .max(17)
    .nullable()
    .optional(),
  serial: z.string().max(100).nullable().optional(),
  assignedTo: z.string().max(200).nullable().optional(),
  status: equipmentStatusEnum.optional(),
});

export const equipmentQuerySchema = z.object({
  status: equipmentStatusEnum.optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
