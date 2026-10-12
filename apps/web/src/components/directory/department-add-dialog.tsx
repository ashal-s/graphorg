"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";

type Kind = "teams" | "sub-departments";

const COPY: Record<
  Kind,
  { button: string; title: string; description: string; placeholder: string }
> = {
  teams: {
    button: "Add teams",
    title: "Add teams",
    description: "Teams can be in several departments, or none.",
    placeholder: "Search teams",
  },
  "sub-departments": {
    button: "Add existing",
    title: "Add sub-departments",
    description: "The departments you pick are moved under this one.",
    placeholder: "Search departments",
  },
};

/**
 * "Add" for a department's page: pick existing teams or departments
 * and put them in this department, without opening the full edit popup.
 */
export function DepartmentAddDialog({
  kind,
  departmentId,
  departmentName,
  existingIds,
  options,
}: {
  kind: Kind;
  departmentId: string;
  departmentName: string;
  /** Teams already in the department (kept when adding more). */
  existingIds: string[];
  /** What can be picked: not already in it, and valid for it. */
  options: { id: string; name: string }[];
}) {
  const router = useRouter();
  const copy = COPY[kind];
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPicked([]);
    setError(null);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "sub-departments") {
        await Promise.all(
          picked.map((childId) => patch(childId, { parentId: departmentId })),
        );
      } else {
        await patch(departmentId, { teamIds: [...existingIds, ...picked] });
      }
      close();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" />
        {copy.button}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent>
          <div>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>
              {copy.description} In {departmentName}.
            </DialogDescription>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`department-add-${kind}`}>
                {kind === "sub-departments" ? "Departments" : "Teams"}
              </Label>
              <SearchableMultiSelect
                id={`department-add-${kind}`}
                options={options.map((o) => ({ id: o.id, label: o.name }))}
                values={picked}
                onValuesChange={setPicked}
                placeholder={copy.placeholder}
                emptyLabel={
                  options.length === 0 ? "Nothing left to add." : "No matches."
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || picked.length === 0}>
                {busy ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
