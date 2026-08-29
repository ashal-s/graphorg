import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["runbook", "adr", "spec", "policy", "other"]).optional(),
  url: z.string().trim().url().max(2000).nullable().optional(),
  ownerTeamId: z.string().uuid().nullable().optional(),
});
