"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { DocumentDialog } from "@/components/documents/document-dialog";
import { useDocuments } from "@/components/documents/documents-context";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Edit (a popup) and delete for the document on screen; editors only. */
export function DocumentActions({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const { documents, canEdit } = useDocuments();
  const [open, setOpen] = useState(false);
  const document = documents.find((d) => d.id === documentId);

  if (!canEdit || !document) return null;

  return (
    <div className="flex shrink-0 items-start gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
              aria-label="Edit details"
              onClick={() => setOpen(true)}
            />
          }
        >
          <Pencil aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <DeleteEntityButton
        entityLabel="document"
        entityName={title}
        apiPath={`/api/documents/${documentId}`}
        redirectTo="/documents"
        iconOnly
      />
      <DocumentDialog open={open} onOpenChange={setOpen} document={document} />
    </div>
  );
}
