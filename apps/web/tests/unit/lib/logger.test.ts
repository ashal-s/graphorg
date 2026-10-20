/**
 * @jest-environment node
 */
import { logger } from "@/lib/logger";

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

  it("creates child loggers with extra bindings", () => {
    const child = logger.child({ requestId: "req-1" });
    expect(child.bindings()).toMatchObject({
      service: "graphorg-web",
      requestId: "req-1",
    });
  });
});
