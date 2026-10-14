"use client";

import { useEffect, useRef, useState } from "react";

import type { ContextScope } from "@/lib/page-context/types";

import { createSseParser } from "./parse-sse";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

/** Matches the route's limit on `history`. */
const MAX_HISTORY = 20;

const GENERIC_ERROR = "Something went wrong. Please try again.";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // not JSON: fall through
  }
  return GENERIC_ERROR;
}

/**
 * A conversation about one page, streamed from `/api/ai/chat`. The page's
 * data is never sent from here: the server rebuilds it from `scope`.
 */
export function useAiChat(scope: ContextScope) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setStreaming(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, question: text, history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        setError(await readErrorMessage(response));
        return;
      }

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

  return { messages, streaming, error, send, stop, clear };
}

export type AiChat = ReturnType<typeof useAiChat>;
