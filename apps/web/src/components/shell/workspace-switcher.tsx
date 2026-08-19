"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data — no auth or tenancy model exists yet (see WEB-133). Replace with
// the user's real workspace list once that lands.
const workspaces = [
  { id: "webifex", name: "Webifex" },
  { id: "acme-demo", name: "Acme Corp (Demo)" },
];

export function WorkspaceSwitcher() {
  const [activeId, setActiveId] = useState(workspaces[0]!.id);
  const active =
    workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between gap-2"
            aria-label="Switch workspace"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{active.name}</span>
        </span>
        <ChevronsUpDown
          className="h-4 w-4 shrink-0 opacity-50"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => setActiveId(workspace.id)}
            className="justify-between"
          >
            {workspace.name}
            {workspace.id === activeId && (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
