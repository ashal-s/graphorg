import { z } from "zod";

export const createToolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  /** Free text: each organization groups its tools its own way. */
  category: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  vendor: z.string().trim().min(1).max(200).nullable().optional(),
  url: z.string().trim().url().max(2000).nullable().optional(),
});
