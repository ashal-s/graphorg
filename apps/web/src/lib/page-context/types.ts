import { z } from "zod";

const id = z.string().uuid();

/**
 * Which page's context to copy. A small, serializable description of "what
 * the page is about", passed from the page to the copy button and on to the
 * server action. Add a kind here, a builder in `registry.ts`, and use it from
 * the page's header.
 */
export const contextScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("overview") }),
  z.object({ kind: z.literal("directory") }),
  z.object({ kind: z.literal("people") }),
  z.object({ kind: z.literal("teams") }),
  z.object({ kind: z.literal("departments") }),
  z.object({ kind: z.literal("department"), id }),
  z.object({ kind: z.literal("person"), id }),
  z.object({ kind: z.literal("team"), id }),
  z.object({ kind: z.literal("org-chart") }),
  z.object({ kind: z.literal("catalog") }),
  z.object({ kind: z.literal("services") }),
  z.object({ kind: z.literal("tools") }),
  z.object({ kind: z.literal("service"), id }),
  z.object({ kind: z.literal("tool"), id }),
  /** `id: null` is the top level of Documents. */
  z.object({ kind: z.literal("folder"), id: id.nullable() }),
  z.object({ kind: z.literal("document"), id }),
  z.object({ kind: z.literal("workflows") }),
  z.object({ kind: z.literal("workflow"), id }),
  z.object({ kind: z.literal("settings-organization") }),
]);

export type ContextScope = z.infer<typeof contextScopeSchema>;
export type ContextKind = ContextScope["kind"];

/** What a builder returns: the page title, its path and its data. */
export interface PageContext {
  page: string;
  path: string;
  data: unknown;
}

/** A related record, by reference: enough to recognise it and find its page. */
export interface ContextRef {
  name: string;
  path: string;
  [extra: string]: unknown;
}
