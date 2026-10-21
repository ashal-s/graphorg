"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { AiChatPanel } from "@/components/shared/ai-chat-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAiChat } from "@/lib/ai/use-ai-chat";
import type { ContextScope } from "@/lib/page-context/types";

const LABEL = "Ask AI about this page";

/**
 * Opens a chat about this page, answered from the same context the copy
 * button puts on the clipboard. Sits beside `CopyContextButton`: see
 * `PageHeader`. The conversation is kept here, not in the sheet, so closing
 * and reopening it doesn't lose it.
 */
export function AiChatButton({
  scope,
  enabled = true,
}: {
  scope: ContextScope;
  /** When false (LaunchDarkly `ai-chat-enabled` off), render nothing. */
  enabled?: boolean;
}) {
  if (!enabled) return null;
  // Keyed by scope so a page that changes it without unmounting (the org
  // chart's tabs) starts a fresh conversation instead of sending the old
  // tab's turns as history alongside the new tab's data.
  return <AiChatSheet key={JSON.stringify(scope)} scope={scope} />;
}

function AiChatSheet({ scope }: { scope: ContextScope }) {
  const [open, setOpen] = useState(false);
  const chat = useAiChat(scope);
  const input = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={LABEL}
              onClick={() => setOpen(true)}
            />
          }
        >
          <Sparkles aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{LABEL}</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className="data-[side=right]:sm:max-w-lg"
          initialFocus={input}
        >
          <AiChatPanel chat={chat} inputRef={input} />
        </SheetContent>
      </Sheet>
    </>
  );
}
