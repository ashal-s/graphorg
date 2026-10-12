import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb, type Database } from "@/db";
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
import { lockOrganization } from "@/lib/api/locks";
import { findMissingInOrg } from "@/lib/api/org-refs";
import {
  ParentCycleError,
  wouldCreateParentCycle,
} from "@/lib/api/service-hierarchy";

import { createFolderSchema } from "../schema";

const updateFolderSchema = createFolderSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `folderId -> parentId` for every folder that has a parent, read in `db`. */
async function loadFolderParents(
  db: Pick<Database, "select">,
  organizationId: string,
) {
  const rows = await db
    .select({ id: documentFolders.id, parentId: documentFolders.parentId })
    .from(documentFolders)
    .where(eq(documentFolders.organizationId, organizationId));
  const parents = new Map<string, string>();
  for (const row of rows) if (row.parentId) parents.set(row.id, row.parentId);
  return parents;
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
  }

  try {
    const row = await getDb().transaction(async (tx) => {
      if (parentId) {
        // The loop check reads every folder, so it runs here, under a lock
        // with the write: two moves that each look fine against the old
        // tree could otherwise commit a loop between them.
        await lockOrganization(tx, session.organizationId, "folder-parents");
        const parents = await loadFolderParents(tx, session.organizationId);
        if (wouldCreateParentCycle(parents, id, parentId)) {
          throw new ParentCycleError();
        }
      }
      const [updated] = await tx
        .update(documentFolders)
        .set(parsed.data)
        .where(eq(documentFolders.id, id))
        .returning();
      return updated;
    });
    return NextResponse.json({ folder: row });
  } catch (error) {
    if (error instanceof ParentCycleError) {
      return jsonError(
        400,
        "parentId would put the folder inside one of its own subfolders",
      );
    }
    throw error;
  }
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
