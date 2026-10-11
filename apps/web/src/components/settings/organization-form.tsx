"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { OrganizationLogo } from "@/components/shared/organization-logo";
import {
  SettingRow,
  SettingsSectionHeader,
} from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface OrganizationDetail {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
}

type Field = "logoUrl" | "name" | "description" | "slug";

const FIELD_LABELS: Record<Field, string> = {
  logoUrl: "Logo",
  name: "Name",
  description: "Description",
  slug: "Workspace slug",
};

export function OrganizationForm({
  organization,
  readOnly = false,
}: {
  organization: OrganizationDetail;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(organization);
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing(field: Field) {
    setError(null);
    setDraft(current[field] ?? "");
    setEditing(field);
  }

  function cancel() {
    setEditing(null);
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const value = draft.trim();
    if ((editing === "name" || editing === "slug") && value.length === 0) {
      setError(`${FIELD_LABELS[editing]} is required.`);
      return;
    }
    if (value === (current[editing] ?? "")) {
      cancel();
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [editing]: value }),
    });
    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const fieldErrors = body?.details as
        Record<string, string[] | undefined> | undefined;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      setError(
        firstFieldError ??
          (typeof body?.error === "string"
            ? body.error
            : "Something went wrong. Please try again."),
      );
      return;
    }

    const body = (await response.json()) as {
      organization: OrganizationDetail;
    };
    setCurrent(body.organization);
    setEditing(null);
    router.refresh();
  }

  function editor(field: Field, input: React.ReactNode, hint?: string) {
    return (
      <form onSubmit={save} className="flex flex-col gap-2">
        {input}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  function display(field: Field, value: React.ReactNode) {
    return (
      <div className="flex items-start gap-1">
        <div className="min-w-0 py-1 text-sm">{value}</div>
        {!readOnly && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${FIELD_LABELS[field].toLowerCase()}`}
                  onClick={() => startEditing(field)}
                  disabled={editing !== null}
                />
              }
            >
              <Pencil aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  const empty = <span className="text-muted-foreground">Not set</span>;

  return (
    <div>
      <SettingsSectionHeader
        title="Organization"
        description={
          readOnly
            ? "Only owners and admins can edit the organization profile."
            : "Shown on the overview page and in the workspace switcher."
        }
      />
      <div className="divide-y divide-border">
        <SettingRow
          label="Logo"
          hint="A link to an image. Its proportions are kept."
        >
          {editing === "logoUrl"
            ? editor(
                "logoUrl",
                <div className="flex items-center gap-4">
                  <OrganizationLogo
                    name={current.name}
                    logoUrl={draft.trim() || null}
                  />
                  <Input
                    autoFocus
                    type="url"
                    inputMode="url"
                    aria-label="Logo URL"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                </div>,
                "Leave blank to remove the logo.",
              )
            : display(
                "logoUrl",
                <OrganizationLogo
                  name={current.name}
                  logoUrl={current.logoUrl}
                />,
              )}
        </SettingRow>

        <SettingRow label="Name">
          {editing === "name"
            ? editor(
                "name",
                <Input
                  autoFocus
                  aria-label="Name"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="e.g. Acme Inc."
                />,
              )
            : display("name", current.name)}
        </SettingRow>

        <SettingRow label="Description" hint="Up to 500 characters.">
          {editing === "description"
            ? editor(
                "description",
                <Textarea
                  autoFocus
                  aria-label="Description"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="What does this organization do?"
                  maxLength={500}
                />,
              )
            : display(
                "description",
                current.description ? (
                  <p className="whitespace-pre-wrap">{current.description}</p>
                ) : (
                  empty
                ),
              )}
        </SettingRow>

        <SettingRow
          label="Workspace slug"
          hint="The identifier members sign in with."
        >
          {editing === "slug"
            ? editor(
                "slug",
                <Input
                  autoFocus
                  aria-label="Workspace slug"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />,
                draft.trim() !== current.slug
                  ? "Everyone must use the new value the next time they sign in."
                  : undefined,
              )
            : display("slug", current.slug)}
        </SettingRow>
      </div>
    </div>
  );
}
