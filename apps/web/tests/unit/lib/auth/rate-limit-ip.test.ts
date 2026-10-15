/**
 * @jest-environment node
 */
import { clientIpFromHeaders } from "../../../../src/lib/auth/rate-limit";

describe("clientIpFromHeaders", () => {
  it("prefers the Vercel-set forwarded address over client X-Forwarded-For", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-vercel-forwarded-for": "9.9.9.9",
    });

    expect(clientIpFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("uses the rightmost X-Forwarded-For hop when Vercel is absent", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 8.8.8.8",
    });

    expect(clientIpFromHeaders(headers)).toBe("8.8.8.8");
  });

  it("ignores spoofable x-real-ip when no trusted hop exists", () => {
    const headers = new Headers({
      "x-real-ip": "5.5.5.5",
    });

    expect(clientIpFromHeaders(headers)).toBe("unknown");
  });
});
