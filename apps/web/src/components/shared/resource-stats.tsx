"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2, UserPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** An API call the stats make on the user's behalf. */
export interface ResourceRequest {
  url: string;
  method: "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
}

/**
 * "Add" as a popup: pick one or more existing records (and optionally a
 * level), and each one is sent as a request.
 */
export interface ResourceAssign {
  /** Button label, e.g. "Add to a team". */
  label: string;
  title: string;
  description?: string;
  /** What can be picked, e.g. teams the person isn't on yet. */
  options: { id: string; label: string }[];
  /** Request per picked option; `{id}` in `url` is replaced by its id. */
  url: string;
  method: "PUT" | "PATCH";
  /** Always sent in the body. */
  body?: Record<string, unknown>;
  searchPlaceholder?: string;
  /** An extra choice sent with each request, e.g. a team level or a role. */
  level?: {
    label: string;
    options: { value: string; label: string }[];
    defaultValue: string;
    /** Body key the choice is sent under. */
    key: string;
    /** Send as a one-item array (`{ roles: ["owner"] }`) instead of a value. */
    asArray?: boolean;
  };
}

export interface ResourceItem {
  id: string;
  name: string;
  /** Where "view" goes. */
  href: string;
  /** Shown as small badges beside the name. */
  badges?: string[];
  /** Where "edit" goes; omitted when the item has no edit screen. */
  editHref?: string;
  /** Shows a remove button that makes this request after confirming. */
  remove?: ResourceRequest;
}

export interface Resource {
  key: string;
  label: string;
  singular: string;
  items: ResourceItem[];
  /** Where "add" goes; omitted when there's no create screen or the user can't create. */
  addHref?: string;
  /** Adds existing records from a popup; omitted when the user can't. */
  assign?: ResourceAssign;
  /** Shown when there are no items. */
  emptyText: string;
}

/**
 * A row of clickable stats (a team's resources, a person's relationships).
 * Selecting one lists its items below, each with view and (where it exists)
 * edit, plus an add action when the user can create that kind of thing.
 */
export function ResourceStats({ resources }: { resources: Resource[] }) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstWithItems = resources.find(
    (resource) => resource.items.length > 0,
  );
  const [activeKey, setActiveKey] = useState(
    (firstWithItems ?? resources[0])?.key,
  );
  const active = resources.find((resource) => resource.key === activeKey);

  async function send(request: ResourceRequest) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.body ? { "Content-Type": "application/json" } : {},
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(
        typeof payload?.error === "string"
          ? payload.error
          : "Something went wrong. Please try again.",
      );
    }
  }

  function openAssign(assign: ResourceAssign) {
    setPicked([]);
    setLevel(assign.level?.defaultValue ?? "");
    setError(null);
    setAssignOpen(true);
  }

  async function submitAssign(event: React.FormEvent) {
    event.preventDefault();
    const assign = active?.assign;
    if (!assign || picked.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        picked.map((id) => {
          const body: Record<string, unknown> = { ...assign.body };
          if (assign.level) {
            body[assign.level.key] = assign.level.asArray ? [level] : level;
          }
          return send({
            url: assign.url.replace("{id}", id),
            method: assign.method,
            body: Object.keys(body).length > 0 ? body : undefined,
          });
        }),
      );
      setAssignOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add.");
    } finally {
      setBusy(false);
      // Some requests may have gone through even if one failed.
      router.refresh();
    }
  }

  async function removeItem(item: ResourceItem) {
    if (!item.remove) return;
    if (!window.confirm(`Remove "${item.name}"?`)) return;
    setError(null);
    try {
      await send(item.remove);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to remove.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div
        style={
          {
            "--stat-cols": `repeat(${resources.length}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-(--stat-cols)"
      >
        {resources.map((resource) => {
          const selected = resource.key === activeKey;
          return (
            <button
              key={resource.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveKey(resource.key)}
              className={cn(
                "bg-background p-4 text-left transition-colors outline-none",
                "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                selected && "bg-muted/50",
              )}
            >
              <span className="block text-sm text-muted-foreground">
                {resource.label}
              </span>
              <span className="mt-1 block text-2xl font-semibold tracking-tight tabular-nums">
                {resource.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-tight">
              {active.label}
            </h2>
            {active.assign && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => active.assign && openAssign(active.assign)}
              >
                <UserPlus aria-hidden="true" />
                {active.assign.label}
              </Button>
            )}
            {active.addHref && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={active.addHref} />}
              >
                <Plus aria-hidden="true" />
                Add {active.singular}
              </Button>
            )}
          </div>

          {error && !assignOpen && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {active.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{active.emptyText}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {active.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 pr-1"
                >
                  <Link
                    href={item.href}
                    className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium hover:underline"
                  >
                    {item.name}
                    {item.badges?.map((badge) => (
                      <Badge key={badge} variant="outline">
                        {badge}
                      </Badge>
                    ))}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    {item.editHref && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              nativeButton={false}
                              className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-400"
                              aria-label={`Edit ${item.name}`}
                              render={<Link href={item.editHref} />}
                            />
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    )}
                    {item.remove && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => removeItem(item)}
                            />
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400"
                            aria-label={`View ${item.name}`}
                            render={<Link href={item.href} />}
                          />
                        }
                      >
                        <Eye aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {active?.assign && (
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent>
            <div>
              <DialogTitle>{active.assign.title}</DialogTitle>
              {active.assign.description && (
                <DialogDescription>
                  {active.assign.description}
                </DialogDescription>
              )}
            </div>

            <form onSubmit={submitAssign} className="flex flex-col gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {active.assign.options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There&apos;s nothing left to add.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="resource-assign-picker">{active.label}</Label>
                  <SearchableMultiSelect
                    id="resource-assign-picker"
                    options={active.assign.options}
                    values={picked}
                    onValuesChange={setPicked}
                    placeholder={active.assign.searchPlaceholder ?? "Search"}
                    emptyLabel="Nothing matches."
                  />
                </div>
              )}

              {active.assign.level && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="resource-assign-level">
                    {active.assign.level.label}
                  </Label>
                  <NativeSelect
                    id="resource-assign-level"
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                  >
                    {active.assign.level.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || picked.length === 0}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
