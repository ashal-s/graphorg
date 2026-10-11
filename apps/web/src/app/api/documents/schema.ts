import { z } from "zod";

/** Only web links: the value is rendered as an `href`, so no `javascript:` etc. */
const webUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), "Must be an http(s) URL");

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["runbook", "adr", "spec", "policy", "other"]).optional(),
  url: webUrl.nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  ownerTeamId: z.string().uuid().nullable().optional(),
  ownerPersonId: z.string().uuid().nullable().optional(),
});
