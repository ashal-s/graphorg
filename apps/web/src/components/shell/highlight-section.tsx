"use client";

import { useEffect } from "react";

import { setNavHighlight } from "@/lib/nav-highlight";

/**
 * Render on a page whose URL doesn't sit under its section so the sidebar
 * still highlights it (e.g. `<HighlightSection href="/directory" />`).
 */
export function HighlightSection({ href }: { href: string }) {
  useEffect(() => {
    setNavHighlight(href);
    return () => setNavHighlight(null);
  }, [href]);
  return null;
}
