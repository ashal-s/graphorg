"use client";

import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface WorkflowPersonOption {
  id: string;
  name: string;
  email: string;
  title: string | null;
}

/**
 * Multi-select for assigning directory people to a workflow role (owner,
 * worker). A Sheet, not a dropdown/combobox: the app has no listbox
 * primitive yet, and a side panel gives room for a search box plus a
 * scrollable roster without extra dependencies.
 */
export function PeoplePicker({
  label,
  people,
  selectedIds,
  onChange,
}: {
  label: string;
  people: WorkflowPersonOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = people.filter((person) => selectedIds.includes(person.id));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? people.filter(
        (person) =>
          person.name.toLowerCase().includes(q) ||
          person.email.toLowerCase().includes(q),
      )
    : people;

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existingId) => existingId !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground">Nobody assigned yet.</p>
        )}
        {selected.map((person) => (
          <Badge key={person.id} variant="secondary" className="gap-1 pr-1">
            {person.name}
            <button
              type="button"
              onClick={() => toggle(person.id)}
              aria-label={`Remove ${person.name} from ${label.toLowerCase()}`}
              className="rounded-full p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Sheet>
        <SheetTrigger
          render={
            <Button type="button" variant="outline" size="sm" className="w-fit" />
          }
        >
          <UserPlus aria-hidden="true" />
          Add {label.toLowerCase()}
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              Choose who from the directory should be {label.toLowerCase()} on
              this workflow.
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
            <Input
              placeholder="Search by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex-1 space-y-1 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No matching people.
                </p>
              )}
              {filtered.map((person) => {
                const isSelected = selectedIds.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggle(person.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted",
                      isSelected && "bg-muted",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{person.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {person.email}
                        {person.title ? ` · ${person.title}` : ""}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <SheetFooter>
            <SheetClose render={<Button type="button" />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
