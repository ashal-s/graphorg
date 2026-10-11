"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

import { TeamForm, type TeamDetail } from "@/components/directory/team-form";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The team's name as the page heading with its description underneath, and
 * an "Edit details" button that swaps in the form. Viewers get the text
 * with no button. `actions` (e.g. delete) sit beside the edit button.
 */
export function TeamDetails({
  team,
  readOnly,
  actions,
}: {
  team: TeamDetail;
  readOnly: boolean;
  actions?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TeamForm
        mode="edit"
        team={team}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        {team.description ? (
          <p className="mt-1 max-w-3xl text-sm whitespace-pre-wrap text-muted-foreground">
            {team.description}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No description</p>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-2">
        {!readOnly && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Edit details"
                  onClick={() => setEditing(true)}
                />
              }
            >
              <Pencil aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        )}
        {actions}
      </div>
    </div>
  );
}
