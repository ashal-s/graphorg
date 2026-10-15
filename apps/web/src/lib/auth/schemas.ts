import { z } from "zod";

/** What the sign-in form collects before a workspace is known. */
export const loginCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

/**
 * Credentials Auth.js authorize() accepts: email + password plus the
 * workspace slug once it has been chosen (or was the only match).
 */
export const loginSchema = loginCredentialsSchema.extend({
  workspace: z.string().trim().min(1, "Workspace is required").toLowerCase(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const signupSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organisation name must be at least 2 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
