"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDocuments } from "@/components/documents/documents-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { folderAndDescendantIds } from "@/lib/documents/tree";
import { messageFromApiError } from "@/lib/api/client-error";

/**
 * Create a folder, or rename / move one. `folder` is set when editing;
 * `parentId` is where a new folder starts out. The form mounts fresh each
 * time the dialog opens, so it always starts from the current values.
 */
export function FolderDialog({
  open,
  onOpenChange,
  folder,
  parentId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: { id: string; name: string; parentId: string | null };
  parentId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FolderForm
          folder={folder}
          parentId={parentId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FolderForm({
  folder,
  parentId,
  onClose,
}: {
  folder?: { id: string; name: string; parentId: string | null };
  parentId: string | null;
  onClose: () => void;
}) {
  const { folders } = useDocuments();
  const router = useRouter();
  const editing = Boolean(folder);

  const [name, setName] = useState(folder?.name ?? "");
  const [parent, setParent] = useState(
    folder ? (folder.parentId ?? "") : (parentId ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A folder can't be moved into itself or one of its own subfolders.
  const blocked = folder
    ? folderAndDescendantIds(folders, folder.id)
    : new Set<string>();
  const options = folders
    .filter((candidate) => !blocked.has(candidate.id))
    .map((candidate) => ({ id: candidate.id, label: candidate.name }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(
      editing ? `/api/document-folders/${folder?.id}` : "/api/document-folders",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parent.length > 0 ? parent : null,
        }),
      },
    );
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        messageFromApiError(body),
      );
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <>
      <div>
        <DialogTitle>{editing ? "Edit folder" : "New folder"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Rename it, or move it into another folder."
            : "Folders keep related documents together."}
        </DialogDescription>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            id="folder-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Runbooks"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="folder-parent">Inside</Label>
          <SearchableSelect
            id="folder-parent"
            options={options}
            value={parent}
            onValueChange={setParent}
            placeholder="Top level"
            emptyLabel="No folders match."
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </>
  );
}
