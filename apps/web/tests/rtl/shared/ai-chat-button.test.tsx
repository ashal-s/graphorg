import { ReadableStream, TextDecoderStream } from "node:stream/web";
import { TextEncoder } from "node:util";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiChatButton } from "@/components/shared/ai-chat-button";

// jsdom doesn't expose the web streams the chat reads its answer with.
Object.assign(globalThis, { ReadableStream, TextDecoderStream, TextEncoder });

const encoder = new TextEncoder();

/** A fetch response whose body streams the given chunks. */
function sseResponse(chunks: string[], provider?: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(provider ? { "X-LLM-Provider": provider } : {}),
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  };
}

const SCOPE = { kind: "teams" } as const;

async function openPanel() {
  const user = userEvent.setup();
  render(<AiChatButton scope={SCOPE} />);
  await user.click(screen.getByRole("button", { name: /ask ai about/i }));
  return user;
}

describe("AiChatButton", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("sends the page scope and question, and shows the streamed answer", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse([
        'data: "Three"\n\n',
        'data: " teams."\n\n',
        'event: done\ndata: ""\n\n',
      ]),
    );
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "How many teams?");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Three teams.")).toBeInTheDocument();
    expect(screen.getByText("How many teams?")).toBeInTheDocument();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/ai/chat");
    expect(JSON.parse(init.body)).toEqual({
      scope: SCOPE,
      question: "How many teams?",
      history: [],
    });
  });

  it("shows whether a local or hosted model answered", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse(['data: "Hi."\n\n'], "hosted"),
    );
    const user = await openPanel();
    expect(screen.queryByText("Hosted model")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Hosted model")).toBeInTheDocument();
  });

  it("ignores a provider value it doesn't know", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse(['data: "Hi."\n\n'], "something-else"),
    );
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");
    await screen.findByText("Hi.");

    expect(screen.queryByText(/model$/)).not.toBeInTheDocument();
  });

  it("sends earlier turns as history on the next question", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(sseResponse(['data: "Seven."\n\n']))
      .mockResolvedValueOnce(sseResponse(['data: "Yes."\n\n']));
    const user = await openPanel();
    const input = screen.getByLabelText("Your question");

    await user.type(input, "How many?");
    await user.keyboard("{Enter}");
    await screen.findByText("Seven.");
    await user.type(input, "Sure?");
    await user.keyboard("{Enter}");
    await screen.findByText("Yes.");

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.history).toEqual([
      { role: "user", content: "How many?" },
      { role: "assistant", content: "Seven." },
    ]);
  });

  it("shows the server's error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "The AI service is unavailable." }),
    });
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("The AI service is unavailable."),
    ).toBeInTheDocument();
    // The unanswered placeholder is dropped; only the question remains.
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
  });

  it("explains how to set the assistant up when no worker is configured", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: "AI is not configured",
        code: "ai_not_configured",
      }),
    });
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(/isn.t set up on this deployment/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Deploy the AI worker/)).toBeInTheDocument();
    expect(screen.getByText("AI_WORKER_URL")).toBeInTheDocument();
    // Not presented as a failure of the request itself.
    expect(screen.queryByText("AI is not configured")).not.toBeInTheDocument();
  });

  it("clears the setup instructions with the conversation", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "x", code: "ai_not_configured" }),
    });
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");
    await screen.findByText(/isn.t set up on this deployment/i);

    await user.click(screen.getByRole("button", { name: /clear chat/i }));

    expect(
      screen.queryByText(/isn.t set up on this deployment/i),
    ).not.toBeInTheDocument();
  });

  it("shows an error the worker sent mid-stream", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse(['event: error\ndata: "The model request failed."\n\n']),
    );
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Hello?");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("The model request failed."),
    ).toBeInTheDocument();
  });

  it("stops a running answer and keeps what arrived", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: "Partial"\n\n'));
              init.signal.addEventListener("abort", () => {
                controller.error(new DOMException("aborted", "AbortError"));
              });
            },
          }),
        }),
    );
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Tell me more");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Partial")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /stop/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument(),
    );
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the conversation", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse(['data: "An answer."\n\n']),
    );
    const user = await openPanel();

    await user.type(screen.getByLabelText("Your question"), "Question");
    await user.keyboard("{Enter}");
    await screen.findByText("An answer.");

    await user.click(screen.getByRole("button", { name: /clear chat/i }));

    expect(screen.queryByText("An answer.")).not.toBeInTheDocument();
  });
});
