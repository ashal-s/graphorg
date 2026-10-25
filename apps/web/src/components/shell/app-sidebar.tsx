"use client";

import { useState, useSyncExternalStore } from "react";
import { PanelLeft } from "lucide-react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "graphorg.sidebar.expanded";
const NAV_ID = "app-sidebar-nav";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSidebarExpanded() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return null;
  }
}

function expandedSnapshot() {
  return readSidebarExpanded() ?? false;
}

function serverSnapshot() {
  return false;
}

function persistSidebarExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(expanded));
    listeners.forEach((listener) => listener());
    return true;
  } catch {
    return false;
  }
}

/**
 * Desktop navigation. Collapsed it is an icon rail with tooltips. A pin
 * control opens the labels and reserves their width, so destinations are
 * never revealed by hover alone.
 */
export function AppSidebar() {
  const stored = useSyncExternalStore(
    subscribe,
    expandedSnapshot,
    serverSnapshot,
  );
  const [unsaved, setUnsaved] = useState<boolean | null>(null);
  const expanded = unsaved ?? stored;

  function toggle() {
    const next = !expanded;
    if (persistSidebarExpanded(next)) {
      setUnsaved(null);
      return;
    }
    setUnsaved(next);
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 md:block",
        expanded ? "w-56" : "w-14",
        "transition-[width] duration-(--duration-enter) ease-(--ease-standard) motion-reduce:transition-none",
      )}
    >
      <div className="sticky top-14 flex h-[calc(100svh-3.5rem)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav id={NAV_ID} collapsed={!expanded} />
        </div>
        <div className="px-2 pb-3">
          <Button
            type="button"
            variant="ghost"
            size={expanded ? "default" : "icon"}
            className={cn(expanded ? "w-full justify-start px-3" : "size-10")}
            aria-expanded={expanded}
            aria-controls={NAV_ID}
            aria-label={expanded ? undefined : "Expand sidebar"}
            onClick={toggle}
          >
            <PanelLeft aria-hidden="true" />
            {expanded ? "Collapse sidebar" : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}
