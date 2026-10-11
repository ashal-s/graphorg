/**
 * @jest-environment node
 */
import { GET } from "@/app/api/people/[id]/photo/route";

const findFirstMock = jest.fn();
jest.mock("../../../src/db", () => ({
  getDb: () => ({ query: { people: { findFirst: findFirstMock } } }),
}));

const getSessionMock = jest.fn();
jest.mock("../../../src/lib/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

const ID = "11111111-1111-4111-8111-111111111111";
const call = (id = ID) =>
  GET(new Request("http://localhost/x") as never, {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  findFirstMock.mockReset();
  getSessionMock.mockReset().mockResolvedValue({
    userId: "u",
    organizationId: "org-a",
    organizationName: "A",
    organizationSlug: "a",
    role: "viewer",
    name: "T",
    email: "t@example.com",
  });
});

describe("GET /api/people/[id]/photo", () => {
  it("requires a session", async () => {
    getSessionMock.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it("rejects a malformed id", async () => {
    expect((await call("nope")).status).toBe(400);
  });

  it("404s when there is no photo", async () => {
    findFirstMock.mockResolvedValue({ photoUrl: null });
    expect((await call()).status).toBe(404);
    findFirstMock.mockResolvedValue(undefined);
    expect((await call()).status).toBe(404);
  });

  it("serves an uploaded photo as an image with a long cache", async () => {
    findFirstMock.mockResolvedValue({
      photoUrl: "data:image/jpeg;base64,/9j/4AAQ",
    });
    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("redirects to a photo that is a link", async () => {
    findFirstMock.mockResolvedValue({ photoUrl: "https://example.com/a.png" });
    const response = await call();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/a.png");
  });
});
