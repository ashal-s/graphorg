import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  /** The service this one sits under (a "system" is a service with children). */
  parentId: z.string().uuid().nullable().optional(),
  repositoryId: z.string().uuid().nullable().optional(),
  ownerTeamId: z.string().uuid().nullable().optional(),
  /** Full replacement set for the tools the service uses (service_tools). */
  toolIds: z.array(z.string().uuid()).optional(),
  /** Full replacement set for the service's direct dependencies (service_dependencies). */
  dependsOnServiceIds: z.array(z.string().uuid()).optional(),
});
