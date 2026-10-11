import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/api/db-errors";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
} from "@/lib/api/http";
import { slugify } from "@/lib/utils";

import { updateOrganizationSchema } from "./schema";

/**
 * Singular, not `/api/organizations`: a caller only ever has one
 * organization (their own tenant), never a collection of them, so there's
 * no list endpoint and no `[id]` segment — the "id" is always the signed-in
 * session's own `organizationId`. No `DELETE`: every table cascades from
 * `organization_id`, so deleting one here would wipe the entire tenant's
 * data (every person, team, service, tool, ...) with no confirmation
 * flow; that's deliberately out of this ticket's scope.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const db = getDb();
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
  });
  if (!organization) return jsonError(404, "Organization not found");

  return NextResponse.json({ organization });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  // Renaming/re-slugging the whole workspace (the slug is also the login
  // identifier every member signs in with) is a bigger blast radius than a
  // catalog edit, so this requires admin, not just editor.
  if (!hasRole(session.role, "admin")) return jsonError(403, "Forbidden");

  const parsed = updateOrganizationSchema.safeParse(
    await readJsonBody(request),
  );
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  const values: {
    name?: string;
    slug?: string;
    description?: string | null;
    logoUrl?: string | null;
    servicesLabelSingular?: string | null;
    servicesLabelPlural?: string | null;
    servicesDescription?: string | null;
    toolsLabelSingular?: string | null;
    toolsLabelPlural?: string | null;
    toolsDescription?: string | null;
  } = {};
  if (parsed.data.name) values.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    values.description = parsed.data.description || null;
  }
  if (parsed.data.logoUrl !== undefined) {
    values.logoUrl = parsed.data.logoUrl || null;
  }
  for (const key of [
    "servicesLabelSingular",
    "servicesLabelPlural",
    "servicesDescription",
    "toolsLabelSingular",
    "toolsLabelPlural",
    "toolsDescription",
  ] as const) {
    // Blank resets to the default wording.
    if (parsed.data[key] !== undefined) values[key] = parsed.data[key] || null;
  }
  if (parsed.data.slug) {
    const slug = slugify(parsed.data.slug);
    if (!slug) {
      return jsonError(400, "slug must contain at least one letter or number");
    }
    values.slug = slug;
  }

  const db = getDb();
  try {
    const [organization] = await db
      .update(organizations)
      .set(values)
      .where(eq(organizations.id, session.organizationId))
      .returning();
    if (!organization) return jsonError(404, "Organization not found");
    return NextResponse.json({ organization });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError(409, "A workspace with this slug already exists");
    }
    throw error;
  }
}
