import { and, eq } from "drizzle-orm";
import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DocumentActions } from "@/components/documents/document-actions";
import { AiChatGate } from "@/components/shared/ai-chat-gate";
import { CopyContextButton } from "@/components/shared/copy-context-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { documentFolders, documents } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { documentTypeLabel } from "@/lib/documents/types";
import { folderPath } from "@/lib/documents/tree";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const orgId = session.organizationId;

  const [document, folders] = await Promise.all([
    getDb().query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.organizationId, orgId)),
      with: {
        ownerTeam: { columns: { id: true, name: true, slug: true } },
        ownerPerson: { columns: { id: true, name: true, slug: true } },
      },
    }),
    getDb().query.documentFolders.findMany({
      where: eq(documentFolders.organizationId, orgId),
      columns: { id: true, name: true, parentId: true },
    }),
  ]);
  if (!document) notFound();

  const path = folderPath(folders, document.folderId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <Link
              href="/documents"
              className="hover:text-foreground hover:underline"
            >
              All documents
            </Link>
            {path.map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <span aria-hidden="true">/</span>
                <Link
                  href={`/documents/folders/${folder.id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {folder.name}
                </Link>
              </span>
            ))}
          </nav>
          <div className="mt-1 flex items-center gap-3">
            <FileText
              className="size-6 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
              {document.title}
            </h1>
            {document.type !== "other" && (
              <Badge variant="outline">
                {documentTypeLabel(document.type)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Suspense fallback={null}>
            <AiChatGate scope={{ kind: "document", id: document.id }} />
          </Suspense>
          <CopyContextButton scope={{ kind: "document", id: document.id }} />
          <DocumentActions documentId={document.id} title={document.title} />
        </div>
      </div>

      {document.url ? (
        <div>
          <Button
            nativeButton={false}
            render={<a href={document.url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink aria-hidden="true" />
            Open document
          </Button>
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {document.url}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No link added yet.</p>
      )}

      <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Folder</dt>
        <dd>
          {path.length > 0 ? (
            <Link
              href={`/documents/folders/${path[path.length - 1]!.id}`}
              className="font-medium hover:underline"
            >
              {path.map((folder) => folder.name).join(" / ")}
            </Link>
          ) : (
            <span className="text-muted-foreground">Top level</span>
          )}
        </dd>
        <dt className="text-muted-foreground">Team</dt>
        <dd>
          {document.ownerTeam ? (
            <Link
              href={`/${document.ownerTeam.slug}`}
              className="font-medium hover:underline"
            >
              {document.ownerTeam.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </dd>
        <dt className="text-muted-foreground">Person</dt>
        <dd>
          {document.ownerPerson ? (
            <Link
              href={`/${document.ownerPerson.slug}`}
              className="font-medium hover:underline"
            >
              {document.ownerPerson.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
