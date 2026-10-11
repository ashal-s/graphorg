import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";

import { validateDocumentRefs } from "../refs";
import { createDocumentSchema } from "../schema";

const updateDocumentSchema = createDocumentSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const row = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.organizationId, session.organizationId),
    ),
    with: {
      ownerTeam: { columns: { id: true, name: true } },
      ownerPerson: { columns: { id: true, name: true } },
      folder: { columns: { id: true, name: true } },
    },
  });
  if (!row) return jsonError(404, "Document not found");

  return NextResponse.json({ document: row });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Document not found");

  const parsed = updateDocumentSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  const refError = await validateDocumentRefs(
    session.organizationId,
    parsed.data,
  );
  if (refError) return refError;

  const [row] = await db
    .update(documents)
    .set(parsed.data)
    .where(eq(documents.id, id))
    .returning();
  return NextResponse.json({ document: row });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const db = getDb();
  const existing = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.organizationId, session.organizationId),
    ),
    columns: { id: true },
  });
  if (!existing) return jsonError(404, "Document not found");

  await db.delete(documents).where(eq(documents.id, id));
  return new NextResponse(null, { status: 204 });
}
