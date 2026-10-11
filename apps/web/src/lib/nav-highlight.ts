"use client";

import { useSyncExternalStore } from "react";

/**
 * Lets a page tell the sidebar which section it belongs to when its URL
 * doesn't say so: a person or team lives at `/<slug>`, but sits under
 * Directory. A one-value store, so setting it never needs React state.
 */
let highlighted: string | null = null;
const listeners = new Set<() => void>();

export function setNavHighlight(href: string | null) {
  if (highlighted === href) return;
  highlighted = href;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The section a page asked to be highlighted, or null. */
export function useNavHighlight(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => highlighted,
    () => null,
  );
}
