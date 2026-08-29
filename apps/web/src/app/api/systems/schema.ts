import { z } from "zod";

export const createSystemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  ownerTeamId: z.string().uuid().nullable().optional(),
});
