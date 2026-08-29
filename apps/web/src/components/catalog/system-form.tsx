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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface SystemDetail {
  id: string;
  name: string;
  description: string | null;
  ownerTeamId: string | null;
}

export function SystemForm({
  mode,
  system,
  teams,
  readOnly = false,
}: {
  mode: "create" | "edit";
  system?: SystemDetail;
  teams: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(system?.name ?? "");
  const [description, setDescription] = useState(system?.description ?? "");
  const [ownerTeamId, setOwnerTeamId] = useState(system?.ownerTeamId ?? "");
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
      ownerTeamId: ownerTeamId.length > 0 ? ownerTeamId : null,
    };

    setSaving(true);
    const response = await fetch(
      mode === "create" ? "/api/systems" : `/api/systems/${system?.id}`,
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

    const body = (await response.json()) as { system: SystemDetail };
    router.push(`/catalog/systems/${body.system.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            You have viewer access, so this system can be viewed but not
            changed.
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
        <CardHeader>
          <CardTitle>System details</CardTitle>
          <CardDescription>
            What this system is and who&apos;s accountable for it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="system-name">Name</Label>
            <Input
              id="system-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Payments"
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="system-description">Description</Label>
            <Textarea
              id="system-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this system do?"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="system-owner-team">Owner team</Label>
            <Select
              id="system-owner-team"
              value={ownerTeamId}
              onChange={(event) => setOwnerTeamId(event.target.value)}
              className="max-w-72"
              disabled={readOnly}
            >
              <option value="">No owner team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create system"
                : "Save changes"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                mode === "create"
                  ? "/catalog/systems"
                  : `/catalog/systems/${system?.id}`
              }
            />
          }
        >
          {readOnly ? "Back" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
