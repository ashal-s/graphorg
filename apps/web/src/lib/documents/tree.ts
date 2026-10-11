export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
}

export interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  url: string | null;
  folderId: string | null;
  ownerTeamId: string | null;
  ownerPersonId: string | null;
}

export interface FolderNode {
  folder: FolderRecord;
  folders: FolderNode[];
  documents: DocumentRecord[];
}

export interface DocumentTree {
  folders: FolderNode[];
  /** Documents not filed in any folder. */
  documents: DocumentRecord[];
}

const byTitle = (a: DocumentRecord, b: DocumentRecord) =>
  a.title.localeCompare(b.title);
const byName = (a: FolderNode, b: FolderNode) =>
  a.folder.name.localeCompare(b.folder.name);

/**
 * Folders (alphabetical) with their subfolders and documents. A folder whose
 * parent is missing is shown at the top level, and a cycle in the data can't
 * hang it: anyone only reachable through a cycle is promoted to the top.
 */
export function buildDocumentTree(
  folders: FolderRecord[],
  documents: DocumentRecord[],
): DocumentTree {
  const nodes = new Map<string, FolderNode>(
    folders.map((folder) => [
      folder.id,
      { folder, folders: [], documents: [] },
    ]),
  );

  const roots: FolderNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.folder.parentId
      ? nodes.get(node.folder.parentId)
      : undefined;
    if (parent && parent !== node) parent.folders.push(node);
    else roots.push(node);
  }

  const reachable = new Set<string>();
  const visit = (node: FolderNode) => {
    if (reachable.has(node.folder.id)) return;
    reachable.add(node.folder.id);
    node.folders.forEach(visit);
  };
  roots.forEach(visit);
  for (const node of nodes.values()) {
    if (reachable.has(node.folder.id)) continue;
    const parent = node.folder.parentId
      ? nodes.get(node.folder.parentId)
      : undefined;
    if (parent) parent.folders = parent.folders.filter((n) => n !== node);
    roots.push(node);
    visit(node);
  }

  const rootDocuments: DocumentRecord[] = [];
  for (const document of documents) {
    const node = document.folderId ? nodes.get(document.folderId) : undefined;
    if (node) node.documents.push(document);
    else rootDocuments.push(document);
  }

  const sort = (list: FolderNode[]) => {
    list.sort(byName);
    for (const node of list) {
      node.documents.sort(byTitle);
      sort(node.folders);
    }
  };
  sort(roots);
  rootDocuments.sort(byTitle);

  return { folders: roots, documents: rootDocuments };
}

/** Folders from the top level down to `folderId`, or [] if unknown. */
export function folderPath(
  folders: FolderRecord[],
  folderId: string | null,
): FolderRecord[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderRecord[] = [];
  const seen = new Set<string>();
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** `folderId` and every folder beneath it (a folder can't move into these). */
export function folderAndDescendantIds(
  folders: FolderRecord[],
  folderId: string,
): Set<string> {
  const ids = new Set<string>([folderId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Folder ids that hold the document at any depth, so a tree can open them. */
export function ancestorFolderIds(
  folders: FolderRecord[],
  documentFolderId: string | null,
): string[] {
  return folderPath(folders, documentFolderId).map((folder) => folder.id);
}
