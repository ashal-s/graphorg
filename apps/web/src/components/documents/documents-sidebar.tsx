"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { DocumentDialog } from "@/components/documents/document-dialog";
import { useDocuments } from "@/components/documents/documents-context";
import { FolderDialog } from "@/components/documents/folder-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ancestorFolderIds,
  buildDocumentTree,
  type FolderNode,
  type FolderRecord,
} from "@/lib/documents/tree";
import { cn } from "@/lib/utils";

type FolderAction =
  | { kind: "new-folder"; parentId: string | null }
  | { kind: "rename"; folder: FolderRecord }
  | { kind: "new-document"; folderId: string | null };

/**
 * The documents sidebar: every folder and document as an expandable tree,
 * with New folder / New document on top and a menu on each folder.
 */
export function DocumentsSidebar() {
  const { folders, documents, canEdit } = useDocuments();
  const pathname = usePathname();
  const router = useRouter();
  const tree = useMemo(
    () => buildDocumentTree(folders, documents),
    [folders, documents],
  );

  // The folder (or document) on screen, so the tree opens to it.
  const current = useMemo(() => {
    const folderMatch = /^\/documents\/folders\/([^/]+)/.exec(pathname);
    if (folderMatch) return { folderId: folderMatch[1]!, documentId: null };
    const documentMatch = /^\/documents\/([^/]+)/.exec(pathname);
    if (documentMatch) {
      const document = documents.find((d) => d.id === documentMatch[1]);
      return {
        folderId: document?.folderId ?? null,
        documentId: documentMatch[1]!,
      };
    }
    return { folderId: null, documentId: null };
  }, [pathname, documents]);

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<FolderAction | null>(null);

  const revealed = useMemo(
    () => new Set(ancestorFolderIds(folders, current.folderId)),
    [folders, current.folderId],
  );
  const isOpen = (id: string) => openIds.has(id) || revealed.has(id);
  const toggle = (id: string) =>
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (isOpen(id)) {
        next.delete(id);
        // `revealed` folders stay open while you're inside them.
      } else next.add(id);
      return next;
    });

  async function removeFolder(folder: FolderRecord) {
    if (
      !window.confirm(
        `Delete the folder "${folder.name}"? Its documents and subfolders move up a level.`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/document-folders/${folder.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      if (current.folderId === folder.id) router.push("/documents");
      router.refresh();
    }
  }

  function renderFolder(node: FolderNode, depth: number) {
    const open = isOpen(node.folder.id);
    const active =
      pathname === `/documents/folders/${node.folder.id}` &&
      !current.documentId;
    const Icon = open ? FolderOpen : Folder;

    return (
      <li key={node.folder.id}>
        <div
          className={cn(
            "group/row flex items-center gap-0.5 rounded-md pr-1 text-sm",
            active ? "bg-muted font-medium" : "hover:bg-muted/60",
          )}
          style={{ paddingLeft: `${depth * 0.75}rem` }}
        >
          <button
            type="button"
            aria-label={open ? "Collapse folder" : "Expand folder"}
            aria-expanded={open}
            onClick={() => toggle(node.folder.id)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-90",
              )}
              aria-hidden="true"
            />
          </button>
          <Link
            href={`/documents/folders/${node.folder.id}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5"
          >
            <Icon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{node.folder.name}</span>
          </Link>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${node.folder.name}`}
                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 outline-none group-focus-within/row:opacity-100 group-hover/row:opacity-100 hover:text-foreground data-popup-open:opacity-100"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() =>
                    setAction({
                      kind: "new-document",
                      folderId: node.folder.id,
                    })
                  }
                >
                  <FilePlus aria-hidden="true" />
                  New document here
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setAction({ kind: "new-folder", parentId: node.folder.id })
                  }
                >
                  <FolderPlus aria-hidden="true" />
                  New subfolder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setAction({ kind: "rename", folder: node.folder })
                  }
                >
                  <Pencil aria-hidden="true" />
                  Rename or move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void removeFolder(node.folder)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {open && (
          <ul>
            {node.folders.map((child) => renderFolder(child, depth + 1))}
            {node.documents.map((document) =>
              renderDocument(document, depth + 1),
            )}
          </ul>
        )}
      </li>
    );
  }

  function renderDocument(
    document: { id: string; title: string },
    depth: number,
  ) {
    const active = current.documentId === document.id;
    return (
      <li key={document.id}>
        <Link
          href={`/documents/${document.id}`}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm",
            active ? "bg-muted font-medium" : "hover:bg-muted/60",
          )}
          style={{ paddingLeft: `${depth * 0.75 + 1.75}rem` }}
        >
          <FileText
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate">{document.title}</span>
        </Link>
      </li>
    );
  }

  const allActive = pathname === "/documents";

  return (
    <aside
      aria-label="Documents"
      className="flex w-full shrink-0 flex-col gap-3 md:w-64"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">Documents</h2>
        {canEdit && (
          <div className="flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New folder"
              title="New folder"
              onClick={() => setAction({ kind: "new-folder", parentId: null })}
            >
              <FolderPlus aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New document"
              title="New document"
              onClick={() =>
                setAction({ kind: "new-document", folderId: null })
              }
            >
              <FilePlus aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <nav aria-label="Folders and documents">
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link
              href="/documents"
              aria-current={allActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1.5 pr-2 pl-1.5 text-sm",
                allActive ? "bg-muted font-medium" : "hover:bg-muted/60",
              )}
            >
              <FolderOpen
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              All documents
            </Link>
          </li>
          {tree.folders.map((node) => renderFolder(node, 0))}
          {tree.documents.map((document) => renderDocument(document, 0))}
          {folders.length === 0 && documents.length === 0 && (
            <li className="px-1.5 py-2 text-sm text-muted-foreground">
              Nothing here yet.
            </li>
          )}
        </ul>
      </nav>

      <FolderDialog
        open={action?.kind === "new-folder" || action?.kind === "rename"}
        onOpenChange={(open) => !open && setAction(null)}
        folder={action?.kind === "rename" ? action.folder : undefined}
        parentId={action?.kind === "new-folder" ? action.parentId : null}
      />
      <DocumentDialog
        open={action?.kind === "new-document"}
        onOpenChange={(open) => !open && setAction(null)}
        folderId={action?.kind === "new-document" ? action.folderId : null}
      />
    </aside>
  );
}
