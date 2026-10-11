import { z } from "zod";

/** Empty string resets the wording to its default. */
const label = z.string().trim().max(40);
const oneLine = z
  .string()
  .trim()
  .max(160)
  .refine((value) => !/[\r\n]/.test(value), "Must be a single line");

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
  /** Email domain, with or without a leading "@". Empty string clears it. */
  emailDomain: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .toLowerCase()
        .max(253)
        .transform((value) => value.replace(/^@+/, ""))
        .refine(
          (value) =>
            /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
              value,
            ),
          "Enter a domain like example.com",
        ),
    ])
    .optional(),
  servicesLabelSingular: label.optional(),
  servicesLabelPlural: label.optional(),
  servicesDescription: oneLine.optional(),
  toolsLabelSingular: label.optional(),
  toolsLabelPlural: label.optional(),
  toolsDescription: oneLine.optional(),
});
