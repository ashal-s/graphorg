export type ChatStreamEvent =
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Feeds raw text chunks in and calls `onEvent` for each complete SSE event
 * the worker sent (`data: "<json string>"`, optionally with `event: done`
 * or `event: error`). Network chunks don't line up with events, so the
 * unfinished tail is kept and joined to the next chunk.
 */
export function createSseParser(onEvent: (event: ChatStreamEvent) => void) {
  let buffer = "";

  return function push(chunk: string) {
    buffer += chunk;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }

      let value = "";
      try {
        value = JSON.parse(data);
      } catch {
        continue;
      }

      if (event === "done") onEvent({ type: "done" });
      else if (event === "error") onEvent({ type: "error", message: value });
      else onEvent({ type: "token", text: value });
    }
  };
}
