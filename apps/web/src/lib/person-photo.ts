/**
 * A person's photo is stored either as a link to an image elsewhere, or as
 * a small uploaded image kept in the database as a `data:` URL. Data URLs
 * are large, so they are never put into page HTML: they are served from
 * `/api/people/[id]/photo` instead.
 */

/** Largest uploaded photo kept, as a data URL (a 256px JPEG is ~20 KB). */
export const MAX_PHOTO_DATA_URL_LENGTH = 300_000;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function isPhotoDataUrl(value: string | null | undefined): boolean {
  return Boolean(value && DATA_URL.test(value));
}

/** Splits an uploaded photo into its content type and raw bytes. */
export function decodePhotoDataUrl(
  value: string,
): { contentType: string; bytes: Buffer } | null {
  const match = DATA_URL.exec(value);
  if (!match) return null;
  return { contentType: match[1]!, bytes: Buffer.from(match[2]!, "base64") };
}

/**
 * What to put in an `<img src>` for this person: the link as-is, or the
 * photo endpoint (versioned by `updatedAt` so a new upload shows at once)
 * for an uploaded image. `null` when they have no photo.
 */
export function personPhotoSrc(person: {
  id: string;
  photoUrl: string | null;
  updatedAt: Date;
}): string | null {
  if (!person.photoUrl) return null;
  if (isPhotoDataUrl(person.photoUrl)) {
    return `/api/people/${person.id}/photo?v=${person.updatedAt.getTime()}`;
  }
  return person.photoUrl;
}
