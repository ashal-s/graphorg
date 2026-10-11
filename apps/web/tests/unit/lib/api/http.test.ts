/**
 * @jest-environment node
 */
import { requireNonEmptyPatch, requireUuidParam } from "@/lib/api/http";

describe("requireUuidParam", () => {
  it("returns null for a well-formed UUID", () => {
    expect(requireUuidParam("11111111-1111-4111-8111-111111111111")).toBeNull();
  });

  it.each(["not-a-uuid", "", "123", "11111111-1111-4111-8111-11111111111"])(
    "returns a 400 response for a malformed id (%s)",
    (id) => {
      // Every `[id]` route (people, teams, tools,
      // documents, services) compares this route param
      // directly against a Postgres `uuid` column; without this check, a
      // value like this would reach the database as an invalid cast and
      // surface as an unhandled 500 instead of a clean 400.
      const response = requireUuidParam(id);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);
    },
  );

  it("includes the given param name in the error message", async () => {
    const response = requireUuidParam("not-a-uuid", "teamId");
    const body = await response?.json();
    expect(body.error).toBe("teamId is not a valid id");
  });
});

describe("requireNonEmptyPatch", () => {
  it("returns a 400 response for an empty object", () => {
    const response = requireNonEmptyPatch({});
    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
  });

  it("returns null when at least one field is present", () => {
    expect(requireNonEmptyPatch({ name: "x" })).toBeNull();
  });
});
