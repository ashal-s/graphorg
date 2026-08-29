import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  /** The workspace login identifier (`loginSchema.workspace`) — validated and normalized the same way signup does. */
  slug: z.string().trim().min(1).max(200).optional(),
});
