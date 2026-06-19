import { z } from "zod";

export const verifySchema = z.object({
  password: z.string().min(1),
});
