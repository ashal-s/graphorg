import { checkRateLimit } from "@/lib/ai/rate-limit";

/**
 * A just-enough Redis: EVAL (INCR + EXPIRE when TTL missing) and TTL, with
 * expiry driven by a clock the test controls.
 */
let now = 0;
const store = new Map<string, { value: number; expiresAt: number | null }>();

function live(key: string) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt !== null && entry.expiresAt <= now) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

const fakeRedis = {
  eval: jest.fn(
    async (
      _script: string,
      _numKeys: number,
      key: string,
      windowSeconds: number | string,
    ) => {
      const windowMs = Number(windowSeconds) * 1000;
      let entry = live(key);
      if (!entry) {
        entry = { value: 0, expiresAt: null };
        store.set(key, entry);
      }
      entry.value += 1;
      // Mirror the Lua: attach a TTL whenever the key has none.
      if (entry.expiresAt === null) {
        entry.expiresAt = now + windowMs;
      }
      return entry.value;
    },
  ),
  ttl: jest.fn(async (key: string) => {
    const entry = live(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.ceil((entry.expiresAt - now) / 1000);
  }),
  expire: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
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

  it("increments and expires atomically via EVAL", async () => {
    await checkRateLimit(OPTS);

    expect(fakeRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining("INCR"),
      1,
      OPTS.key,
      60,
    );
    expect(store.get(OPTS.key)?.expiresAt).toBe(60_000);
  });

  it("restores expiry on a persistent orphan counter", async () => {
    store.set(OPTS.key, { value: 3, expiresAt: null });

    const result = await checkRateLimit(OPTS);

    expect(result.allowed).toBe(false);
    expect(store.get(OPTS.key)?.expiresAt).toBe(60_000);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("never reports a retry time below one second", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit(OPTS);
    now += 59_999;

    const result = await checkRateLimit(OPTS);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
