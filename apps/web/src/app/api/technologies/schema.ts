import { z } from "zod";

export const technologyCategorySchema = z.enum([
  "language",
  "framework",
  "database",
  "infrastructure",
  "other",
]);

export const createTechnologySchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: technologyCategorySchema.optional(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
});
