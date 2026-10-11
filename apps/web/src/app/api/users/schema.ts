import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schemas";

const roleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

/**
 * Adds a member: either someone already in the people directory (`personId`,
 * whose name and email are used), or someone new entered by hand
 * (`name` + `email`).
 */
export const createUserSchema = z
  .object({
    personId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
    /** Initial password; there's no invite email flow, so the admin sets it. */
    password: passwordSchema,
    role: roleSchema,
    /** For someone entered by hand: also list them in the people directory. */
    addToDirectory: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.personId) return;
    if (!value.name) {
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "Name is required",
      });
    }
    if (!value.email) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email is required",
      });
    }
  });

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email().max(320).optional(),
  role: roleSchema.optional(),
  /** Resets the member's password. */
  password: passwordSchema.optional(),
});
