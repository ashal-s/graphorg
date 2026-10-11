import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  /** The workspace login identifier (`loginSchema.workspace`) — validated and normalized the same way signup does. */
  slug: z.string().trim().min(1).max(200).optional(),
  /** Empty string clears the description. */
  description: z.string().trim().max(500).optional(),
  /** Empty string clears the logo. Must be an http(s) URL. */
  logoUrl: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .max(2000)
        .url()
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "Must be an http(s) URL",
        ),
    ])
    .optional(),
});
