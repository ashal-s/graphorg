/**
 * @jest-environment node
 */
import { GET } from "@/app/api/health/route";

/**
 * Public liveness probe for Better Stack (and similar) uptime monitors.
 * Must stay unauthenticated — `proxy.ts` already excludes `/api` from the
 * auth redirect matcher.
 */
describe("GET /api/health", () => {
  it("returns 200 with ok true and status ok", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { status: "ok" } });
  });
});
