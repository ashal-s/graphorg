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
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { messageFromApiError } from "@/lib/api/client-error";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/documents/types";
import type { DocumentRecord } from "@/lib/documents/tree";

/**
 * Add a document (a name and a link), file it in a folder and assign it to a
 * team and/or a person; or edit one. `folderId` is where a new one starts.
 * The form mounts fresh each time the dialog opens.
 */
export function DocumentDialog({
  open,
  onOpenChange,
  document,
  folderId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: DocumentRecord;
  folderId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DocumentForm
          document={document}
          folderId={folderId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DocumentForm({
  document,
  folderId,
  onClose,
}: {
  document?: DocumentRecord;
  folderId: string | null;
  onClose: () => void;
}) {
  const { folders, teams, people } = useDocuments();
  const router = useRouter();
  const editing = Boolean(document);

  const [title, setTitle] = useState(document?.title ?? "");
  const [url, setUrl] = useState(document?.url ?? "");
  const [type, setType] = useState<DocumentType>(document?.type ?? "other");
  const [folder, setFolder] = useState(
    document ? (document.folderId ?? "") : (folderId ?? ""),
  );
  const [teamId, setTeamId] = useState(document?.ownerTeamId ?? "");
  const [personId, setPersonId] = useState(document?.ownerPersonId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(
      editing ? `/api/documents/${document?.id}` : "/api/documents",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim().length > 0 ? url.trim() : null,
          type,
          folderId: folder.length > 0 ? folder : null,
          ownerTeamId: teamId.length > 0 ? teamId : null,
          ownerPersonId: personId.length > 0 ? personId : null,
        }),
      },
    );
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(messageFromApiError(body));
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <>
      <div>
        <DialogTitle>{editing ? "Edit document" : "New document"}</DialogTitle>
        <DialogDescription>
          A name and a link to where the document lives.
        </DialogDescription>
      </div>
      <form onSubmit={save} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-title">Name</Label>
          <Input
            id="doc-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. On-call handbook"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc-url">Link</Label>
          <Input
            id="doc-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-type">Type</Label>
            <NativeSelect
              id="doc-type"
              value={type}
              onChange={(event) => setType(event.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-folder">Folder</Label>
            <SearchableSelect
              id="doc-folder"
              options={folders.map((f) => ({ id: f.id, label: f.name }))}
              value={folder}
              onValueChange={setFolder}
              placeholder="No folder"
              emptyLabel="No folders match."
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-team">Team</Label>
            <SearchableSelect
              id="doc-team"
              options={teams.map((t) => ({ id: t.id, label: t.name }))}
              value={teamId}
              onValueChange={setTeamId}
              placeholder="Assign to a team"
              emptyLabel="No teams match."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-person">Person</Label>
            <SearchableSelect
              id="doc-person"
              options={people.map((p) => ({ id: p.id, label: p.name }))}
              value={personId}
              onValueChange={setPersonId}
              placeholder="Assign to a person"
              emptyLabel="No people match."
            />
          </div>
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
