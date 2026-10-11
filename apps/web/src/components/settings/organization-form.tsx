"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OrganizationLogo } from "@/components/shared/organization-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SettingRow,
  SettingsSectionHeader,
} from "@/components/settings/setting-row";

export interface OrganizationDetail {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
}

export function OrganizationForm({
  organization,
  readOnly = false,
}: {
  organization: OrganizationDetail;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [description, setDescription] = useState(
    organization.description ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (slug.trim().length === 0) {
      setError("Workspace slug is required.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim(),
      }),
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
    setName(body.organization.name);
    setSlug(body.organization.slug);
    setDescription(body.organization.description ?? "");
    setLogoUrl(body.organization.logoUrl ?? "");
    setSaved(true);
    router.refresh();
  }

  const slugChanged = slug.trim() !== organization.slug;

  return (
    <form onSubmit={handleSubmit}>
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
          htmlFor="org-logo"
          hint="A link to an image. Its proportions are kept."
        >
          <div className="flex items-center gap-4">
            <OrganizationLogo name={name} logoUrl={logoUrl} />
            <Input
              id="org-logo"
              type="url"
              inputMode="url"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={readOnly}
              className="flex-1"
            />
          </div>
        </SettingRow>
        <SettingRow label="Name" htmlFor="org-name">
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Inc."
            required
            disabled={readOnly}
          />
        </SettingRow>
        <SettingRow
          label="Description"
          htmlFor="org-description"
          hint="Up to 500 characters."
        >
          <Textarea
            id="org-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this organization do?"
            maxLength={500}
            disabled={readOnly}
          />
        </SettingRow>
        <SettingRow
          label="Workspace slug"
          htmlFor="org-slug"
          hint="The identifier members sign in with."
        >
          <Input
            id="org-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            disabled={readOnly}
          />
          {slugChanged && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Everyone must use the new value the next time they sign in.
            </p>
          )}
        </SettingRow>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-muted-foreground">
              Saved.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
