"use client";

import { useEffect, useRef, useState } from "react";

import type { ContextScope } from "@/lib/page-context/types";

import { AI_NOT_CONFIGURED } from "./errors";
import { createSseParser } from "./parse-sse";
import { GENERIC_ERROR } from "@/lib/api/client-error";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

/** Matches the route's limit on `history`. */
const MAX_HISTORY = 20;

export type AiProvider = "local" | "hosted";

async function readError(
  response: Response,
): Promise<{ message: string; code: string | null }> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      code?: unknown;
    };
    return {
      message: typeof body.error === "string" ? body.error : GENERIC_ERROR,
      code: typeof body.code === "string" ? body.code : null,
    };
  } catch {
    // not JSON: fall through
  }
  return { message: GENERIC_ERROR, code: null };
}

/**
 * A conversation about one page, streamed from `/api/ai/chat`. The page's
 * data is never sent from here: the server rebuilds it from `scope`.
 */
export function useAiChat(scope: ContextScope) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when this deployment has no AI worker configured: the panel then
  // shows setup instructions in place of an error.
  const [setupNeeded, setSetupNeeded] = useState(false);
  // Which kind of model answered the latest request, once we know.
  const [provider, setProvider] = useState<AiProvider | null>(null);

  // Mirrors `messages` so `send` always reads the latest conversation, even
  // when it is called again before React has re-rendered.
  const messagesRef = useRef<ChatMessage[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  function commit(next: ChatMessage[]) {
    messagesRef.current = next;
    setMessages(next);
  }

  function append(id: number, text: string) {
    commit(
      messagesRef.current.map((message) =>
        message.id === id
          ? { ...message, content: message.content + text }
          : message,
      ),
    );
  }

  /** Stop and keep the partial answer; the request is cancelled upstream too. */
  function stop() {
    controllerRef.current?.abort();
  }

  function clear() {
    controllerRef.current?.abort();
    commit([]);
    setError(null);
    setSetupNeeded(false);
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || controllerRef.current) return;

    // History is what came before this question; the question travels
    // separately.
    const history = messagesRef.current
      .filter((message) => message.content)
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content }));

    const assistantId = nextId.current + 1;
    commit([
      ...messagesRef.current,
      { id: nextId.current, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    nextId.current += 2;

    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setSetupNeeded(false);
    setStreaming(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, question: text, history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const failure = await readError(response);
        if (failure.code === AI_NOT_CONFIGURED) setSetupNeeded(true);
        else setError(failure.message);
        return;
      }

      const reported = response.headers?.get("X-LLM-Provider");
      if (reported === "local" || reported === "hosted") setProvider(reported);

      const outcome: { error: string | null } = { error: null };
      const push = createSseParser((event) => {
        if (event.type === "token") append(assistantId, event.text);
        else if (event.type === "error") outcome.error = event.message;
      });

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        push(value);
      }
      if (outcome.error) setError(outcome.error);
    } catch (caught) {
      // Stop is a normal outcome, not an error.
      const aborted =
        caught instanceof DOMException && caught.name === "AbortError";
      if (!aborted) setError(GENERIC_ERROR);
    } finally {
      // An answer that never produced a token isn't worth keeping.
      commit(
        messagesRef.current.filter(
          (message) => message.id !== assistantId || message.content,
        ),
      );
      if (controllerRef.current === controller) controllerRef.current = null;
      setStreaming(false);
    }
  }

  useEffect(() => () => controllerRef.current?.abort(), []);

  return {
    messages,
    streaming,
    error,
    setupNeeded,
    provider,
    send,
    stop,
    clear,
  };
}

export type AiChat = ReturnType<typeof useAiChat>;
