"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Confirm, DELETE, and redirect: the same three steps every entity detail
 * page needs to let an editor remove a row, so it's one shared button
 * instead of four near-identical handlers.
 */
export function DeleteEntityButton({
  entityLabel,
  entityName,
  apiPath,
  redirectTo,
  iconOnly = false,
}: {
  /** e.g. "team", used in the confirmation and error copy. */
  entityLabel: string;
  entityName: string;
  apiPath: string;
  redirectTo: string;
  /** A trash icon with "Delete" on hover, instead of a labelled button. */
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${entityName}"? This can't be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    const response = await fetch(apiPath, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : `Failed to delete this ${entityLabel}. Please try again.`,
      );
      setDeleting(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                disabled={deleting}
                onClick={handleDelete}
                aria-label={`Delete ${entityLabel}`}
              />
            }
          >
            <Trash2 aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{deleting ? "Deleting…" : "Delete"}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting…" : `Delete ${entityLabel}`}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
