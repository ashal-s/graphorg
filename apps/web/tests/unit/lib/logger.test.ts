/**
 * @jest-environment node
 */
import { logger, resolveLogLevel } from "@/lib/logger";

describe("logger", () => {
  it("exposes structured log methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("includes the service base field", () => {
    expect(logger.bindings()).toMatchObject({ service: "graphorg-web" });
  });

  it("falls back when LOG_LEVEL is not a pino level", () => {
    expect(resolveLogLevel("verbose", "development")).toBe("debug");
    expect(resolveLogLevel("verbose", "production")).toBe("info");
    expect(resolveLogLevel("warn", "production")).toBe("warn");
    expect(resolveLogLevel(undefined, "test")).toBe("debug");
  });

  it("creates child loggers with extra bindings", () => {
    const child = logger.child({ requestId: "req-1" });
    expect(child.bindings()).toMatchObject({
      service: "graphorg-web",
      requestId: "req-1",
    });
  });
});
