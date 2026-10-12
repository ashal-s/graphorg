"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  FilePlus,
  FileText,
  Folder,
  FolderPlus,
} from "lucide-react";

import { DocumentDialog } from "@/components/documents/document-dialog";
import { useDocuments } from "@/components/documents/documents-context";
import { FolderDialog } from "@/components/documents/folder-dialog";
import { CopyContextButton } from "@/components/shared/copy-context-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { buildDocumentTree, folderPath } from "@/lib/documents/tree";

/**
 * What's inside a folder (or the top level, when `folderId` is null):
 * subfolders then documents, each a link, with add buttons for editors.
 */
export function FolderView({ folderId }: { folderId: string | null }) {
  const { folders, documents, teams, people, canEdit } = useDocuments();
  const [dialog, setDialog] = useState<"folder" | "document" | null>(null);

  const folder = folderId ? folders.find((f) => f.id === folderId) : null;
  if (folderId && !folder) {
    return (
      <EmptyState
        icon={
          <Folder
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
        }
        title="Folder not found"
        description="It may have been deleted."
        action={
          <Button
            size="sm"
            render={<Link href="/documents" />}
            nativeButton={false}
          >
            All documents
          </Button>
        }
      />
    );
  }

  const tree = buildDocumentTree(folders, documents);
  const subfolders = folderId
    ? (findNode(tree.folders, folderId)?.folders ?? [])
    : tree.folders;
  const docs = folderId
    ? (findNode(tree.folders, folderId)?.documents ?? [])
    : tree.documents;
  const path = folderPath(folders, folderId);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const personName = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
            {path.map((item) => (
              <span key={item.id} className="flex items-center gap-1">
                <span aria-hidden="true">/</span>
                <Link
                  href={`/documents/folders/${item.id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {item.name}
                </Link>
              </span>
            ))}
          </nav>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
            {folder ? folder.name : "All documents"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog("folder")}
              >
                <FolderPlus aria-hidden="true" />
                New folder
              </Button>
              <Button size="sm" onClick={() => setDialog("document")}>
                <FilePlus aria-hidden="true" />
                New document
              </Button>
            </>
          )}
          <CopyContextButton scope={{ kind: "folder", id: folderId }} />
        </div>
      </div>

      {subfolders.length === 0 && docs.length === 0 ? (
        <EmptyState
          icon={
            <FileText
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          }
          title={folder ? "This folder is empty" : "No documents yet"}
          description={
            canEdit
              ? "Add a document with a name and a link, or create a folder."
              : "Nothing has been added here yet."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {subfolders.map((node) => (
            <li key={node.folder.id}>
              <Link
                href={`/documents/folders/${node.folder.id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
              >
                <Folder
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {node.folder.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {node.documents.length + node.folders.length} item
                  {node.documents.length + node.folders.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
          {docs.map((document) => (
            <li
              key={document.id}
              className="flex items-center hover:bg-muted/50"
            >
              <Link
                href={`/documents/${document.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm"
              >
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate font-medium">
                  {document.title}
                </span>
                {document.type !== "other" && (
                  <Badge variant="outline">{document.type}</Badge>
                )}
                {document.ownerTeamId && teamName.get(document.ownerTeamId) && (
                  <Badge variant="secondary">
                    {teamName.get(document.ownerTeamId)}
                  </Badge>
                )}
                {document.ownerPersonId &&
                  personName.get(document.ownerPersonId) && (
                    <Badge variant="secondary">
                      {personName.get(document.ownerPersonId)}
                    </Badge>
                  )}
              </Link>
              {document.url && (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${document.title}`}
                  className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <FolderDialog
        open={dialog === "folder"}
        onOpenChange={(open) => !open && setDialog(null)}
        parentId={folderId}
      />
      <DocumentDialog
        open={dialog === "document"}
        onOpenChange={(open) => !open && setDialog(null)}
        folderId={folderId}
      />
    </div>
  );
}

function findNode(
  nodes: ReturnType<typeof buildDocumentTree>["folders"],
  id: string,
): ReturnType<typeof buildDocumentTree>["folders"][number] | undefined {
  for (const node of nodes) {
    if (node.folder.id === id) return node;
    const inner = findNode(node.folders, id);
    if (inner) return inner;
  }
  return undefined;
}
