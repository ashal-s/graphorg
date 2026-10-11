import {
  decodePhotoDataUrl,
  isPhotoDataUrl,
  personPhotoSrc,
} from "@/lib/person-photo";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("person photo helpers", () => {
  it("recognises uploaded image data URLs only", () => {
    expect(isPhotoDataUrl(PIXEL)).toBe(true);
    expect(isPhotoDataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(isPhotoDataUrl("data:text/html;base64,PGgxPg==")).toBe(false);
    expect(isPhotoDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isPhotoDataUrl("https://example.com/a.png")).toBe(false);
    expect(isPhotoDataUrl(null)).toBe(false);
  });

  it("decodes a data URL into its type and bytes", () => {
    const decoded = decodePhotoDataUrl(PIXEL);
    expect(decoded?.contentType).toBe("image/png");
    expect(decoded?.bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(decodePhotoDataUrl("https://example.com/a.png")).toBeNull();
  });

  it("links an uploaded photo to the endpoint, versioned by update time", () => {
    const updatedAt = new Date("2026-01-01T00:00:00Z");
    expect(personPhotoSrc({ id: "p-1", photoUrl: PIXEL, updatedAt })).toBe(
      `/api/people/p-1/photo?v=${updatedAt.getTime()}`,
    );
  });

  it("passes a plain link through and returns null for no photo", () => {
    const updatedAt = new Date();
    expect(
      personPhotoSrc({
        id: "p-1",
        photoUrl: "https://example.com/a.png",
        updatedAt,
      }),
    ).toBe("https://example.com/a.png");
    expect(personPhotoSrc({ id: "p-1", photoUrl: null, updatedAt })).toBeNull();
  });
});
