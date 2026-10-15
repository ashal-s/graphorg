import {
  historyBudget,
  MAX_CONTEXT_CHARS,
  MAX_HISTORY_CHARS,
  MAX_PROMPT_CHARS,
  MAX_QUESTION_CHARS,
  trimHistory,
} from "@/lib/ai/limits";

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

describe("historyBudget", () => {
  it("gives history its full allowance beside a small page", () => {
    expect(historyBudget({ contextChars: 2_000, questionChars: 50 })).toBe(
      MAX_HISTORY_CHARS,
    );
  });

  it("shrinks history as the page grows", () => {
    const small = historyBudget({ contextChars: 8_000, questionChars: 50 });
    const large = historyBudget({ contextChars: 13_000, questionChars: 50 });

    expect(large).toBeLessThan(small);
    expect(large).toBeGreaterThan(0);
  });

  it("shrinks history as the question grows", () => {
    const short = historyBudget({ contextChars: 13_000, questionChars: 10 });
    const long = historyBudget({ contextChars: 13_000, questionChars: 2_000 });

    expect(long).toBeLessThan(short);
  });

  it("never goes negative", () => {
    expect(
      historyBudget({ contextChars: MAX_PROMPT_CHARS, questionChars: 2_000 }),
    ).toBe(0);
  });

  it("keeps the worst case inside the model window", () => {
    // A page at its cap and the longest question: whatever history the
    // budget allows must still leave the prompt within its allowance.
    const history = historyBudget({
      contextChars: MAX_CONTEXT_CHARS,
      questionChars: MAX_QUESTION_CHARS,
    });

    expect(
      MAX_CONTEXT_CHARS + MAX_QUESTION_CHARS + history,
    ).toBeLessThanOrEqual(MAX_PROMPT_CHARS - 1_000);
    // And history is not squeezed to nothing even then.
    expect(history).toBeGreaterThanOrEqual(4_000);
  });
});
