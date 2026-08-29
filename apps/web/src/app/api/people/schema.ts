import { z } from "zod";

export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  /** Links this directory entry to a product account (users). Optional: not everyone in the directory has product access. */
  userId: z.string().uuid().nullable().optional(),
});
