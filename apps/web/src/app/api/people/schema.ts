import { z } from "zod";

import { MAX_PHOTO_DATA_URL_LENGTH, isPhotoDataUrl } from "@/lib/person-photo";

export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  /**
   * A profile picture: a link (http or https) or an uploaded image as a
   * small `data:image/...;base64,...` URL. Null or "" clears it.
   */
  photoUrl: z
    .union([
      z.literal(""),
      z
        .string()
        .max(MAX_PHOTO_DATA_URL_LENGTH)
        .refine(isPhotoDataUrl, "Must be a JPEG, PNG or WebP image"),
      z
        .string()
        .trim()
        .max(2000)
        .url()
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "Must be an http(s) URL",
        ),
    ])
    .nullable()
    .optional(),
  /** Full replacement set of the teams this person is on. Levels on teams they stay on are kept. */
  teamIds: z.array(z.string().uuid()).max(100).optional(),
  /** Which of `teamIds` is their primary team. */
  primaryTeamId: z.string().uuid().nullable().optional(),
  /** Full replacement set of the departments they are directly in. */
  departmentIds: z.array(z.string().uuid()).max(100).optional(),
  /** Which of `departmentIds` is their primary department. */
  primaryDepartmentId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  /** Links this directory entry to a product account (users). Optional: not everyone in the directory has product access. */
  userId: z.string().uuid().nullable().optional(),
});
