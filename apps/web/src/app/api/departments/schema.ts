import { z } from "zod";

const uuid = z.string().uuid();

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  /** The department this one sits under; null makes it top-level. */
  parentId: uuid.nullable().optional(),
  /** Who runs it. Needn't be one of its people. */
  headPersonId: uuid.nullable().optional(),
  /** Full replacement set of the teams in this department. */
  teamIds: z.array(uuid).max(500).optional(),
  /** Full replacement set of the people directly in this department. */
  personIds: z.array(uuid).max(1000).optional(),
});
