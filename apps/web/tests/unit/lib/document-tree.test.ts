import {
  ancestorFolderIds,
  buildDocumentTree,
  folderAndDescendantIds,
  folderPath,
  type DocumentRecord,
  type FolderRecord,
} from "@/lib/documents/tree";

const folder = (id: string, name: string, parentId: string | null = null) => ({
  id,
  name,
  parentId,
});
const doc = (
  id: string,
  title: string,
  folderId: string | null = null,
): DocumentRecord => ({
  id,
  title,
  type: "other",
  url: null,
  folderId,
  ownerTeamId: null,
  ownerPersonId: null,
});

const folders: FolderRecord[] = [
  folder("eng", "Engineering"),
  folder("runbooks", "Runbooks", "eng"),
  folder("hr", "HR"),
];

describe("buildDocumentTree", () => {
  it("nests folders, files documents, and sorts by name", () => {
    const tree = buildDocumentTree(folders, [
      doc("d1", "Zeta", "runbooks"),
      doc("d2", "Alpha", "runbooks"),
      doc("d3", "Handbook", "hr"),
      doc("d4", "Loose file"),
    ]);

    expect(tree.folders.map((n) => n.folder.name)).toEqual([
      "Engineering",
      "HR",
    ]);
    const eng = tree.folders[0]!;
    expect(eng.folders.map((n) => n.folder.name)).toEqual(["Runbooks"]);
    expect(eng.folders[0]!.documents.map((d) => d.title)).toEqual([
      "Alpha",
      "Zeta",
    ]);
    expect(tree.documents.map((d) => d.title)).toEqual(["Loose file"]);
  });

  it("puts a document with an unknown folder at the top level", () => {
    const tree = buildDocumentTree([], [doc("d1", "Orphan", "gone")]);
    expect(tree.documents.map((d) => d.title)).toEqual(["Orphan"]);
  });

  it("shows a folder whose parent is missing at the top level", () => {
    const tree = buildDocumentTree([folder("a", "A", "gone")], []);
    expect(tree.folders.map((n) => n.folder.id)).toEqual(["a"]);
  });

  it("survives a cycle in the data", () => {
    const tree = buildDocumentTree(
      [folder("a", "A", "b"), folder("b", "B", "a")],
      [doc("d1", "In A", "a")],
    );
    const ids = new Set<string>();
    const walk = (nodes: typeof tree.folders) =>
      nodes.forEach((n) => {
        ids.add(n.folder.id);
        walk(n.folders);
      });
    walk(tree.folders);
    expect(ids).toEqual(new Set(["a", "b"]));
  });
});

describe("folder helpers", () => {
  it("returns the path from the top down", () => {
    expect(folderPath(folders, "runbooks").map((f) => f.name)).toEqual([
      "Engineering",
      "Runbooks",
    ]);
    expect(folderPath(folders, null)).toEqual([]);
    expect(folderPath(folders, "nope")).toEqual([]);
  });

  it("lists a folder and everything beneath it", () => {
    expect(folderAndDescendantIds(folders, "eng")).toEqual(
      new Set(["eng", "runbooks"]),
    );
    expect(folderAndDescendantIds(folders, "hr")).toEqual(new Set(["hr"]));
  });

  it("lists the folders to open to reveal a document", () => {
    expect(ancestorFolderIds(folders, "runbooks")).toEqual(["eng", "runbooks"]);
    expect(ancestorFolderIds(folders, null)).toEqual([]);
  });
});
