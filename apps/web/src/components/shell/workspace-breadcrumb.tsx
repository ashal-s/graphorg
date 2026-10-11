"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GraphOrgMark } from "@/components/shell/graphorg-mark";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchWorkspace } from "@/lib/auth/actions";
import type { Workspace } from "@/lib/shell-workspaces";

/**
 * "[mark] GraphOrg / [logo] Acme Corp ▾": the app, then the current
 * workspace as a breadcrumb that opens a menu of workspaces. Picking
 * another one signs out and lands on its sign-in page.
 */
export function WorkspaceBreadcrumb({
  current,
  others,
}: {
  current: Workspace;
  others: Workspace[];
}) {
  const router = useRouter();
  return (
    <nav
      aria-label="Workspace"
      className="flex min-w-0 items-center gap-2 text-sm"
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GraphOrgMark className="size-6" />
        <span className="hidden sm:inline">GraphOrg</span>
      </Link>
      <span className="text-muted-foreground/60" aria-hidden="true">
        /
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1 font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted"
          aria-label={`Workspace: ${current.name}. Switch workspace`}
        >
          <OrganizationLogo
            name={current.name}
            logoUrl={current.logoUrl}
            className="h-5 max-w-10 text-[10px]"
          />
          <span className="truncate">{current.name}</span>
          <ChevronDown
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/")}>
            <OrganizationLogo
              name={current.name}
              logoUrl={current.logoUrl}
              className="h-5 max-w-10 text-[10px]"
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {current.name}
            </span>
            <Check aria-label="Current workspace" />
          </DropdownMenuItem>
          {others.length > 0 && <DropdownMenuSeparator />}
          {others.map((workspace) => (
            <DropdownMenuItem
              key={workspace.slug}
              onClick={() => void switchWorkspace(workspace.slug)}
            >
              <OrganizationLogo
                name={workspace.name}
                logoUrl={workspace.logoUrl}
                className="h-5 max-w-10 text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
