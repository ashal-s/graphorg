import {
  getPostHogHost,
  getPostHogKey,
  isPostHogConfigured,
  posthogInitOptions,
} from "@/lib/posthog/config";

describe("posthog config", () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
    }
    if (originalHost === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = originalHost;
    }
  });

  it("reports unconfigured when the key is missing or blank", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(isPostHogConfigured()).toBe(false);
    expect(getPostHogKey()).toBeUndefined();

    process.env.NEXT_PUBLIC_POSTHOG_KEY = "   ";
    expect(isPostHogConfigured()).toBe(false);
  });

  it("reads the key and defaults the host to US cloud", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_abc";
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

    expect(isPostHogConfigured()).toBe(true);
    expect(getPostHogKey()).toBe("phc_abc");
    expect(getPostHogHost()).toBe("https://us.i.posthog.com");
  });

  it("honours an override host", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_abc";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    expect(getPostHogHost()).toBe("https://eu.i.posthog.com");
  });

  it("disables feature flags and masks session-replay inputs", () => {
    const opts = posthogInitOptions();
    expect(opts.advanced_disable_feature_flags).toBe(true);
    expect(opts.disable_session_recording).toBe(false);
    expect(opts.session_recording.maskAllInputs).toBe(true);
    expect(opts.person_profiles).toBe("identified_only");
  });
});
