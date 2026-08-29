import { z } from "zod";

export const createRepositorySchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2000).nullable().optional(),
  ownerTeamId: z.string().uuid().nullable().optional(),
});
