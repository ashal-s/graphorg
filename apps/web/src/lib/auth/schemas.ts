import { z } from "zod";

export const loginSchema = z.object({
  workspace: z.string().trim().min(1, "Workspace is required").toLowerCase(),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organisation name must be at least 2 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export type SignupInput = z.infer<typeof signupSchema>;
