import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  /** Full replacement set of the departments this team is in (it may be in none). */
  departmentIds: z.array(z.string().uuid()).max(100).optional(),
  /** Which of `departmentIds` is its primary department. */
  primaryDepartmentId: z.string().uuid().nullable().optional(),
});
