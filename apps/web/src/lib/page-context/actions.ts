"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";

import { buildPageContext, wrapContext } from "./build";
import { contextScopeSchema } from "./types";

export type CopyContextResult =
  { ok: true; json: string } | { ok: false; message: string };

/**
 * The JSON for a page's copy button, built when it is clicked rather than on
 * every page view. Scoped to the signed-in user's organization.
 */
export async function getPageContext(
  rawScope: unknown,
): Promise<CopyContextResult> {
  const session = await requireSession();
  const scope = contextScopeSchema.safeParse(rawScope);
  if (!scope.success) return { ok: false, message: "Unknown page." };

  const orgId = session.organizationId;
  const [context, organization] = await Promise.all([
    buildPageContext(orgId, scope.data),
    getDb().query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { name: true },
    }),
  ]);
  if (!context) return { ok: false, message: "This page no longer exists." };

  const document = wrapContext(context, {
    organization: organization?.name ?? session.organizationName,
    generatedAt: new Date(),
  });
  return { ok: true, json: JSON.stringify(document, null, 2) };
}
