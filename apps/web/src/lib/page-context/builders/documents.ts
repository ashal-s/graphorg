import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { documentFolders, documents } from "@/db/schema";
import { folderPath } from "@/lib/documents/tree";

import { contextPaths } from "../paths";
import type { PageContext } from "../types";

/**
 * A folder's contents (or the top level for `folderId: null`): subfolders and
 * documents by title and type. Document links and bodies are not included.
 */
export async function buildFolder(
  orgId: string,
  folderId: string | null,
): Promise<PageContext | null> {
  const db = getDb();
  const [folders, docs] = await Promise.all([
    db.query.documentFolders.findMany({
      where: eq(documentFolders.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
    }),
    db.query.documents.findMany({
      where: eq(documents.organizationId, orgId),
      columns: { id: true, title: true, type: true, folderId: true },
      with: {
        ownerTeam: { columns: { name: true, slug: true } },
        ownerPerson: { columns: { name: true, slug: true } },
      },
      orderBy: (row, { asc }) => asc(row.title),
    }),
  ]);

  const folder = folderId ? folders.find((f) => f.id === folderId) : null;
  if (folderId && !folder) return null;

  const here = docs.filter((d) => (d.folderId ?? null) === folderId);
  const subfolders = folders
    .filter((f) => (f.parentId ?? null) === folderId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    page: folder ? folder.name : "All documents",
    path: folderId ? contextPaths.folder(folderId) : "/documents",
    data: {
      name: folder ? folder.name : "All documents",
      location: folderPath(folders, folderId).map((f) => f.name),
      folders: subfolders.map((f) => ({
        name: f.name,
        path: contextPaths.folder(f.id),
      })),
      documents: here.map((d) => ({
        name: d.title,
        type: d.type,
        path: contextPaths.document(d.id),
        ownerTeam: d.ownerTeam?.name ?? null,
        ownerPerson: d.ownerPerson?.name ?? null,
      })),
    },
  };
}

export async function buildDocument(
  orgId: string,
  id: string,
): Promise<PageContext | null> {
  const db = getDb();
  const [document, folders] = await Promise.all([
    db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.organizationId, orgId)),
      with: {
        ownerTeam: { columns: { name: true, slug: true } },
        ownerPerson: { columns: { name: true, slug: true } },
      },
    }),
    db.query.documentFolders.findMany({
      where: eq(documentFolders.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
    }),
  ]);
  if (!document) return null;

  return {
    page: document.title,
    path: contextPaths.document(document.id),
    data: {
      title: document.title,
      type: document.type,
      url: document.url,
      location: folderPath(folders, document.folderId).map((f) => f.name),
      ownerTeam: document.ownerTeam && {
        name: document.ownerTeam.name,
        path: contextPaths.team(document.ownerTeam.slug),
      },
      ownerPerson: document.ownerPerson && {
        name: document.ownerPerson.name,
        path: contextPaths.person(document.ownerPerson.slug),
      },
    },
  };
}
