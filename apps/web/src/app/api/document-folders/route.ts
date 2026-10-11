import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { documentFolders } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";

import { createFolderSchema } from "./schema";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const rows = await getDb().query.documentFolders.findMany({
    where: eq(documentFolders.organizationId, session.organizationId),
    orderBy: (row, { asc }) => asc(row.name),
  });
  return NextResponse.json({ folders: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const parsed = createFolderSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { parentId, name } = parsed.data;

  if (parentId) {
    const missing = await findMissingInOrg(
      documentFolders.id,
      documentFolders.organizationId,
      session.organizationId,
      [parentId],
    );
    if (missing.length > 0) {
      return jsonError(
        400,
        "parentId does not reference a folder in this organization",
      );
    }
  }

  const [row] = await getDb()
    .insert(documentFolders)
    .values({
      name,
      parentId: parentId ?? null,
      organizationId: session.organizationId,
    })
    .returning();
  return NextResponse.json({ folder: row }, { status: 201 });
}
