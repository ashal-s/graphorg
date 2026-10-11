import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getDb } from "@/db";
import { people } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { jsonError, requireUuidParam } from "@/lib/api/http";
import { decodePhotoDataUrl } from "@/lib/person-photo";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * A person's uploaded photo as an image. The page links here with a
 * `?v=` version, so a long cache is safe: a new upload changes the URL.
 * A photo that is a link elsewhere redirects to it.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const idError = requireUuidParam(id);
  if (idError) return idError;

  const person = await getDb().query.people.findFirst({
    where: and(
      eq(people.id, id),
      eq(people.organizationId, session.organizationId),
    ),
    columns: { photoUrl: true },
  });
  if (!person?.photoUrl) return jsonError(404, "No photo");

  const decoded = decodePhotoDataUrl(person.photoUrl);
  if (!decoded) return NextResponse.redirect(person.photoUrl);

  return new NextResponse(new Uint8Array(decoded.bytes), {
    headers: {
      "Content-Type": decoded.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
