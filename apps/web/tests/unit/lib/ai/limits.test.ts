import { trimHistory } from "@/lib/ai/limits";

const user = (content: string) => ({ role: "user" as const, content });
const assistant = (content: string) => ({
  role: "assistant" as const,
  content,
});

describe("trimHistory", () => {
  it("returns everything when it fits", () => {
    const history = [user("hello"), assistant("hi there"), user("and?")];

    expect(trimHistory(history, 100)).toEqual(history);
  });

  it("drops the oldest messages first and keeps the order", () => {
    const history = [
      user("a".repeat(40)),
      assistant("b".repeat(40)),
      user("c".repeat(40)),
    ];

    expect(trimHistory(history, 100)).toEqual([history[1], history[2]]);
  });

  it("keeps a message that exactly fills the budget", () => {
    const history = [user("a".repeat(10))];

    expect(trimHistory(history, 10)).toEqual(history);
  });

  it("stops at the first overflow instead of skipping to older messages", () => {
    // The old short message would fit, but keeping it would leave a gap.
    const history = [
      user("a"),
      assistant("b".repeat(90)),
      user("c".repeat(20)),
    ];

    expect(trimHistory(history, 50)).toEqual([history[2]]);
  });

  it("keeps nothing when even the newest message is too long", () => {
    expect(trimHistory([user("a".repeat(200))], 100)).toEqual([]);
  });

  it("handles an empty history and leaves the input untouched", () => {
    expect(trimHistory([], 100)).toEqual([]);

    const history = [user("1"), assistant("2")];
    trimHistory(history, 100);
    expect(history.map((m) => m.content)).toEqual(["1", "2"]);
  });
});
