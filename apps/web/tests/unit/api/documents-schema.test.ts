import { createDocumentSchema } from "@/app/api/documents/schema";

describe("document links", () => {
  it.each(["https://example.com/doc", "http://intranet/wiki/page"])(
    "accepts %s",
    (url) => {
      expect(createDocumentSchema.safeParse({ title: "x", url }).success).toBe(
        true,
      );
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,<h1>hi</h1>",
    "ftp://x.io/a",
  ])("rejects %s", (url) => {
    expect(createDocumentSchema.safeParse({ title: "x", url }).success).toBe(
      false,
    );
  });

  it("accepts a folder and an owner team and person", () => {
    const result = createDocumentSchema.safeParse({
      title: "Handbook",
      folderId: "11111111-1111-4111-8111-111111111111",
      ownerTeamId: "22222222-2222-4222-8222-222222222222",
      ownerPersonId: "33333333-3333-4333-8333-333333333333",
    });
    expect(result.success).toBe(true);
  });
});
