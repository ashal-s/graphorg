import { z } from "zod";

export const toolCategorySchema = z.enum([
  "source_control",
  "ci_cd",
  "issue_tracking",
  "documentation",
  "feature_flags",
  "cloud",
  "observability",
  "other",
]);

export const createToolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: toolCategorySchema.optional(),
  vendor: z.string().trim().min(1).max(200).nullable().optional(),
  url: z.string().trim().url().max(2000).nullable().optional(),
});
