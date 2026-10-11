import type { ReactNode } from "react";
import { eq } from "drizzle-orm";

import { DocumentsProvider } from "@/components/documents/documents-context";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";
import { getDb } from "@/db";
import { documentFolders, documents, people, teams } from "@/db/schema";
import { hasRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

/**
 * Documents get their own sidebar of folders and files beside the page. The
 * whole tree is loaded once here and shared with the sidebar, the folder
 * views and the dialogs, so adding something refreshes all of them.
 */
export default async function DocumentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const orgId = session.organizationId;
  const db = getDb();

  const [folders, docs, teamRows, peopleRows] = await Promise.all([
    db.query.documentFolders.findMany({
      where: eq(documentFolders.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
    }),
    db.query.documents.findMany({
      where: eq(documents.organizationId, orgId),
      columns: {
        id: true,
        title: true,
        type: true,
        url: true,
        folderId: true,
        ownerTeamId: true,
        ownerPersonId: true,
      },
    }),
    db.query.teams.findMany({
      where: eq(teams.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
    db.query.people.findMany({
      where: eq(people.organizationId, orgId),
      columns: { id: true, name: true },
      orderBy: (row, { asc }) => asc(row.name),
    }),
  ]);

  return (
    <DocumentsProvider
      value={{
        folders,
        documents: docs,
        teams: teamRows,
        people: peopleRows,
        canEdit: hasRole(session.role, "editor"),
      }}
    >
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <DocumentsSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </DocumentsProvider>
  );
}
