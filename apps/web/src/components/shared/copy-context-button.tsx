"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPageContext } from "@/lib/page-context/actions";
import type { ContextScope } from "@/lib/page-context/types";

type Status = "idle" | "copied" | "error";

const LABELS: Record<Status, string> = {
  idle: "Copy page context as JSON",
  copied: "Copied",
  error: "Couldn't copy",
};

/**
 * Copies this page's context as JSON, to paste into an AI for advice or
 * review. The JSON is built on the server when you click, so the page itself
 * carries none of it. Every page header renders one: see `PageHeader`.
 */
export function CopyContextButton({ scope }: { scope: ContextScope }) {
  const [status, setStatus] = useState<Status>("idle");
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function fetchJson(): Promise<string> {
    const result = await getPageContext(scope);
    if (!result.ok) throw new Error(result.message);
    return result.json;
  }

  async function copy() {
    setPending(true);
    clearTimeout(timer.current);
    try {
      const json = fetchJson();
      // Handing the clipboard a promise keeps the user gesture alive across
      // the server round trip, which Safari otherwise rejects.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": json.then(
              (text) => new Blob([text], { type: "text/plain" }),
            ),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(await json);
      }
      setStatus("copied");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const Icon =
    status === "copied" ? Check : status === "error" ? TriangleAlert : Copy;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={LABELS[status]}
            disabled={pending}
            onClick={() => void copy()}
          />
        }
      >
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{LABELS[status]}</TooltipContent>
    </Tooltip>
  );
}
