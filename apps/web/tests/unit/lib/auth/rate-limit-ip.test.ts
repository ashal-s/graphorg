/**
 * @jest-environment node
 */
import { clientIpFromHeaders } from "../../../../src/lib/auth/rate-limit";

describe("clientIpFromHeaders", () => {
  it("uses the Vercel-set forwarded address", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-vercel-forwarded-for": "9.9.9.9",
    });

    expect(clientIpFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("ignores client-supplied X-Forwarded-For without a trusted proxy", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 8.8.8.8",
    });

    expect(clientIpFromHeaders(headers)).toBeNull();
  });

  it("ignores spoofable x-real-ip", () => {
    const headers = new Headers({
      "x-real-ip": "5.5.5.5",
    });

    expect(clientIpFromHeaders(headers)).toBeNull();
  });
});
