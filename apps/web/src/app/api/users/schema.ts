import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schemas";

const roleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  /** Initial password; there's no invite email flow, so the admin sets it. */
  password: passwordSchema,
  role: roleSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email().max(320).optional(),
  role: roleSchema.optional(),
  /** Resets the member's password. */
  password: passwordSchema.optional(),
});
