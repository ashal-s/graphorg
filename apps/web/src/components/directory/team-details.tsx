"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { TeamForm, type TeamDetail } from "@/components/directory/team-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * A team's name and description as plain text, with an "Edit details"
 * button that swaps in the form. Viewers get the text with no button.
 */
export function TeamDetails({
  team,
  readOnly,
}: {
  team: TeamDetail;
  readOnly: boolean;
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Team details</CardTitle>
            <CardDescription>
              Who this team is and what it does.
            </CardDescription>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" />
              Edit details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Name</p>
          <p className="text-sm">{team.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          {team.description ? (
            <p className="text-sm whitespace-pre-wrap">{team.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
