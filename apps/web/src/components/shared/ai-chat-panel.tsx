"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Square, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { AiChat } from "@/lib/ai/use-ai-chat";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Summarize this page",
  "What looks unusual or worth a closer look?",
];

/** Close enough to the bottom that new text should keep it in view. */
const STICK_THRESHOLD_PX = 80;

/**
 * The conversation itself. State lives in `useAiChat`, owned by the button
 * so it survives the sheet closing; this only draws it.
 */
export function AiChatPanel({
  chat,
  inputRef,
}: {
  chat: AiChat;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const {
    messages,
    streaming,
    error,
    setupNeeded,
    provider,
    send,
    stop,
    clear,
  } = chat;
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, error, setupNeeded]);

  function submit(question: string) {
    const text = question.trim();
    if (!text || streaming) return;
    stickToBottom.current = true;
    setDraft("");
    void send(text);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          Ask AI
          {provider && (
            <Badge variant="secondary">
              {provider === "local" ? "Local model" : "Hosted model"}
            </Badge>
          )}
        </SheetTitle>
        <SheetDescription>
          Answers come from this page&apos;s data.
        </SheetDescription>
      </SheetHeader>

      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight <
            STICK_THRESHOLD_PX;
        }}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              Ask a question about what&apos;s on this page.
            </p>
            {EXAMPLES.map((example) => (
              <Button
                key={example}
                type="button"
                variant="outline"
                size="sm"
                disabled={streaming}
                onClick={() => submit(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            data-role={message.role}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {message.content ||
              (streaming && message.role === "assistant" ? "Thinking…" : "")}
          </div>
        ))}

        {setupNeeded && (
          <Alert>
            <AlertTitle>
              The AI assistant isn&apos;t set up on this deployment
            </AlertTitle>
            <AlertDescription>
              <p>
                The app is running, but there is no AI worker for it to talk to.
                To enable the assistant:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Deploy the AI worker (<code>services/ai-worker</code>) and
                  point it at a model, local or hosted.
                </li>
                <li>
                  Set <code>AI_WORKER_URL</code> and{" "}
                  <code>AI_WORKER_SECRET</code> on this app. The secret must
                  match the worker&apos;s <code>INTERNAL_SECRET</code>.
                </li>
                <li>Redeploy this app, then ask again.</li>
              </ol>
              <p className="mt-2">
                Full steps are in <code>docs/ai-local-setup.md</code> in the
                repository.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <form
        className="flex flex-col gap-2 border-t p-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <Textarea
          ref={inputRef}
          value={draft}
          maxLength={2000}
          rows={2}
          aria-label="Your question"
          placeholder="Ask about this page…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter adds a line. Leave IME composition alone.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit(draft);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={messages.length === 0 && !error && !setupNeeded}
            onClick={clear}
          >
            <Trash2 aria-hidden="true" />
            Clear chat
          </Button>
          {streaming ? (
            <Button type="button" variant="outline" onClick={stop}>
              <Square aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!draft.trim()}>
              <SendHorizontal aria-hidden="true" />
              Send
            </Button>
          )}
        </div>
      </form>
    </>
  );
}
