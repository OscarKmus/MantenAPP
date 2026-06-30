import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  fullName: z.string().min(1).max(200),
  role: z.enum(["USER", "ADMIN"]).optional().default("USER"),
}).strict();

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
}).strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
