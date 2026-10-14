import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { getSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { buildPageContext, wrapContext } from "@/lib/page-context/build";
import { contextScopeSchema } from "@/lib/page-context/types";

const bodySchema = z.object({
  scope: contextScopeSchema,
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .default([]),
});

export async function POST(request: NextRequest) {
  // 1. who is asking?
  const session = await getSession();
  if (!session) return jsonError(401, "Unauthorized");

  // 2. is AI configured?
  const env = getEnv();
  if (!env.AI_WORKER_SECRET) return jsonError(503, "AI is not configured");

  // 3. validate the body
  const parsed = bodySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonValidationError(parsed.error);
  const { scope, question, history } = parsed.data;

  // 4. build the context on the server, for this user's organization
  const context = await buildPageContext(session.organizationId, scope);
  if (!context) return jsonError(404, "This page no longer exists.");
  const pageContext = JSON.stringify(
    wrapContext(context, {
      organization: session.organizationName,
      generatedAt: new Date(),
    }),
  );

  // 5. forward to the worker
  let upstream: Response;
  try {
    upstream = await fetch(`${env.AI_WORKER_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": env.AI_WORKER_SECRET,
      },
      body: JSON.stringify({ question, page_context: pageContext, history }),
      signal: request.signal,
    });
  } catch {
    return jsonError(502, "The AI service is unavailable.");
  }
  if (!upstream.ok || !upstream.body) {
    return jsonError(502, "The AI service is unavailable.");
  }

  // 6. pipe the stream straight through
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}