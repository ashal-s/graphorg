import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { documentFolders, documents } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import {
  jsonError,
  jsonValidationError,
  readJsonBody,
  requireNonEmptyPatch,
  requireUuidParam,
} from "@/lib/api/http";
import { findMissingInOrg } from "@/lib/api/org-refs";
import { wouldCreateParentCycle } from "@/lib/api/service-hierarchy";

import { createFolderSchema } from "../schema";

const updateFolderSchema = createFolderSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadFolder(organizationId: string, id: string) {
  return getDb().query.documentFolders.findFirst({
    where: and(
      eq(documentFolders.id, id),
      eq(documentFolders.organizationId, organizationId),
    ),
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const folder = await loadFolder(session.organizationId, id);
  if (!folder) return jsonError(404, "Folder not found");
  return NextResponse.json({ folder });
}

/** Rename a folder or move it under another one (never under itself). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const existing = await loadFolder(session.organizationId, id);
  if (!existing) return jsonError(404, "Folder not found");

  const parsed = updateFolderSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const emptyPatchError = requireNonEmptyPatch(parsed.data);
  if (emptyPatchError) return emptyPatchError;

  const { parentId } = parsed.data;
  if (parentId) {
    if (parentId === id) {
      return jsonError(400, "a folder cannot be inside itself");
    }
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

    const all = await getDb().query.documentFolders.findMany({
      where: eq(documentFolders.organizationId, session.organizationId),
      columns: { id: true, parentId: true },
    });
    const parents = new Map<string, string>();
    for (const folder of all) {
      if (folder.parentId) parents.set(folder.id, folder.parentId);
    }
    if (wouldCreateParentCycle(parents, id, parentId)) {
      return jsonError(
        400,
        "parentId would put the folder inside one of its own subfolders",
      );
    }
  }

  const [row] = await getDb()
    .update(documentFolders)
    .set(parsed.data)
    .where(eq(documentFolders.id, id))
    .returning();
  return NextResponse.json({ folder: row });
}

/**
 * Deletes the folder only: its subfolders and documents move up to its
 * parent (or to the top level) rather than being lost.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");
  if (!hasRole(session.role, "editor")) return jsonError(403, "Forbidden");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const existing = await loadFolder(session.organizationId, id);
  if (!existing) return jsonError(404, "Folder not found");

  await getDb().transaction(async (tx) => {
    await tx
      .update(documentFolders)
      .set({ parentId: existing.parentId })
      .where(eq(documentFolders.parentId, id));
    await tx
      .update(documents)
      .set({ folderId: existing.parentId })
      .where(eq(documents.folderId, id));
    await tx.delete(documentFolders).where(eq(documentFolders.id, id));
  });

  return new NextResponse(null, { status: 204 });
}
