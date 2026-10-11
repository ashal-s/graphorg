"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface TeamDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export function TeamForm({
  mode,
  team,
  readOnly = false,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  team?: TeamDetail;
  readOnly?: boolean;
  /** When set, Cancel calls this instead of navigating away (inline editing). */
  onCancel?: () => void;
  /** When set, a successful save calls this instead of navigating to the team. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/teams" : `/api/teams/${team?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Something went wrong. Please try again.",
      );
      setSaving(false);
      return;
    }

    const body = (await response.json()) as { team: TeamDetail };
    if (onSaved) {
      onSaved();
    } else {
      router.push(`/${body.team.slug}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this team can be viewed but not changed.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        {!onCancel && (
          <CardHeader>
            <CardTitle>Team details</CardTitle>
            <CardDescription>
              Who this team is and what it does.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Platform"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this team own?"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create team"
                : "Save changes"}
          </Button>
        )}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={mode === "create" ? "/directory/teams" : `/${team?.slug}`}
              />
            }
          >
            {readOnly ? "Back" : "Cancel"}
          </Button>
        )}
      </div>
    </form>
  );
}
