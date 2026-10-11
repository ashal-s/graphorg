import { z } from "zod";

export const createTeamFunctionSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
