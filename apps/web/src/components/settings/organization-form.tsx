"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {readOnly && (
        <Alert>
          <AlertTitle>View-only</AlertTitle>
          <AlertDescription>
            Only owners and admins can edit the organization profile.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            The organization profile has been updated.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>
            Shown on the overview page and in the workspace switcher.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-xl after:rounded-xl">
              {logoUrl.trim() && (
                <AvatarImage
                  key={logoUrl.trim()}
                  src={logoUrl.trim()}
                  alt=""
                  className="rounded-xl"
                />
              )}
              <AvatarFallback className="rounded-xl bg-primary/10 text-xl font-semibold text-primary">
                {name.trim().slice(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="org-logo">Logo URL</Label>
              <Input
                id="org-logo"
                type="url"
                inputMode="url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Acme Inc."
              required
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-description">Description</Label>
            <Textarea
              id="org-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this organization do?"
              maxLength={500}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-slug">Workspace slug</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">
              The workspace identifier members sign in with.
              {slugChanged &&
                " Changing it means everyone must use the new value the next time they sign in."}
            </p>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}
