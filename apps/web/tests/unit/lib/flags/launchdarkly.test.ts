import {
  getLaunchDarklySdkKey,
  isLaunchDarklyConfigured,
  resetLaunchDarklyClientForTests,
  variation,
} from "@/lib/flags/launchdarkly";

describe("launchdarkly flags", () => {
  const original = process.env.LAUNCHDARKLY_SDK_KEY;

  afterEach(() => {
    resetLaunchDarklyClientForTests();
    if (original === undefined) {
      delete process.env.LAUNCHDARKLY_SDK_KEY;
    } else {
      process.env.LAUNCHDARKLY_SDK_KEY = original;
    }
  });

  it("reports unconfigured when the SDK key is missing", () => {
    delete process.env.LAUNCHDARKLY_SDK_KEY;
    expect(isLaunchDarklyConfigured()).toBe(false);
    expect(getLaunchDarklySdkKey()).toBeUndefined();
  });

  it("returns the default without calling LaunchDarkly when unset", async () => {
    delete process.env.LAUNCHDARKLY_SDK_KEY;
    await expect(
      variation("ai-chat-enabled", { kind: "user", key: "u1" }, true),
    ).resolves.toBe(true);
    await expect(
      variation("ai-chat-enabled", { kind: "user", key: "u1" }, false),
    ).resolves.toBe(false);
  });
});
