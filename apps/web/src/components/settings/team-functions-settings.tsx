"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { SettingsSectionHeader } from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TeamFunctionItem {
  id: string;
  name: string;
  /** How many people currently have this function. */
  peopleCount: number;
}

export function TeamFunctionsSettings({
  functions,
}: {
  functions: TeamFunctionItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/team-functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Something went wrong. Please try again.",
      );
      return;
    }
    setName("");
    router.refresh();
  }

  async function remove(item: TeamFunctionItem) {
    const detail =
      item.peopleCount > 0
        ? ` ${item.peopleCount} ${item.peopleCount === 1 ? "person has" : "people have"} it and will be left without a function.`
        : "";
    if (!window.confirm(`Delete "${item.name}"?${detail}`)) return;
    setError(null);
    const response = await fetch(`/api/team-functions/${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Something went wrong. Please try again.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSectionHeader
        title="Team functions"
        description="What people do on their teams, such as Developer or Product Owner. Shared by every team."
      />

      <form onSubmit={add} className="flex items-center gap-2">
        <Input
          aria-label="New function name"
          placeholder="e.g. DevOps Engineer"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>
          {busy ? "Adding…" : "Add function"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {functions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No functions yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {functions.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 pr-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.peopleCount === 0
                    ? "Not assigned"
                    : `${item.peopleCount} ${item.peopleCount === 1 ? "person" : "people"}`}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => remove(item)}
                    />
                  }
                >
                  <Trash2 aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
