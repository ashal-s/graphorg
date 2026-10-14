import { createSseParser, type ChatStreamEvent } from "@/lib/ai/parse-sse";

function collect() {
  const events: ChatStreamEvent[] = [];
  const push = createSseParser((event) => events.push(event));
  return { events, push };
}

describe("createSseParser", () => {
  it("emits a token for each complete data event", () => {
    const { events, push } = collect();

    push('data: "The"\n\ndata: " lead"\n\n');

    expect(events).toEqual([
      { type: "token", text: "The" },
      { type: "token", text: " lead" },
    ]);
  });

  it("joins an event that is split across chunks", () => {
    const { events, push } = collect();

    push('data: "Hel');
    expect(events).toEqual([]);
    push('lo"\n\ndata: "!"');
    expect(events).toEqual([{ type: "token", text: "Hello" }]);
    push("\n\n");
    expect(events).toEqual([
      { type: "token", text: "Hello" },
      { type: "token", text: "!" },
    ]);
  });

  it("keeps newlines inside a token", () => {
    const { events, push } = collect();

    push('data: "line one\\nline two"\n\n');

    expect(events).toEqual([{ type: "token", text: "line one\nline two" }]);
  });

  it("recognises done and error events", () => {
    const { events, push } = collect();

    push('event: error\ndata: "The model request failed."\n\n');
    push('event: done\ndata: ""\n\n');

    expect(events).toEqual([
      { type: "error", message: "The model request failed." },
      { type: "done" },
    ]);
  });

  it("ignores a malformed event instead of throwing", () => {
    const { events, push } = collect();

    push("data: not json\n\n");
    push('data: "ok"\n\n');

    expect(events).toEqual([{ type: "token", text: "ok" }]);
  });
});
