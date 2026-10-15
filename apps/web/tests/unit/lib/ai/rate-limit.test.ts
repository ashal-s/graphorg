import { checkRateLimit } from "@/lib/ai/rate-limit";

/**
 * A just-enough Redis: SET with EX/NX, INCR and TTL, with expiry driven by a
 * clock the test controls.
 */
let now = 0;
const store = new Map<string, { value: number; expiresAt: number }>();

function live(key: string) {
  const entry = store.get(key);
  if (entry && entry.expiresAt <= now) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

const fakeRedis = {
  set: jest.fn(
    async (key: string, value: number, _ex: "EX", seconds: number) => {
      if (live(key)) return null;
      store.set(key, { value, expiresAt: now + seconds * 1000 });
      return "OK";
    },
  ),
  incr: jest.fn(async (key: string) => {
    const entry = live(key);
    if (!entry)
      throw new Error("INCR on a missing key: SET NX should run first");
    entry.value += 1;
    return entry.value;
  }),
  ttl: jest.fn(async (key: string) => {
    const entry = live(key);
    return entry ? Math.ceil((entry.expiresAt - now) / 1000) : -2;
  }),
};

jest.mock("../../../../src/lib/redis", () => ({
  getRedis: () => fakeRedis,
}));

const OPTS = { key: "ai:rl:user-1", limit: 3, windowSeconds: 60 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    now = 0;
    store.clear();
    jest.clearAllMocks();
  });

  it("allows requests up to the limit", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await checkRateLimit(OPTS)).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
    }
  });

  it("blocks the request after the limit and says how long to wait", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit(OPTS);
    now += 20_000;

    const result = await checkRateLimit(OPTS);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(40);
  });

  it("starts a fresh window once the key has expired", async () => {
    for (let i = 0; i < 4; i++) await checkRateLimit(OPTS);
    now += 60_000;

    expect((await checkRateLimit(OPTS)).allowed).toBe(true);
  });

  it("counts each user separately", async () => {
    for (let i = 0; i < 4; i++) await checkRateLimit(OPTS);

    const other = await checkRateLimit({ ...OPTS, key: "ai:rl:user-2" });

    expect(other.allowed).toBe(true);
  });

  it("sets the expiry when the counter is created, not in a second step", async () => {
    await checkRateLimit(OPTS);

    expect(fakeRedis.set).toHaveBeenCalledWith(OPTS.key, 0, "EX", 60, "NX");
  });

  it("never reports a retry time below one second", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit(OPTS);
    now += 59_999;

    const result = await checkRateLimit(OPTS);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
