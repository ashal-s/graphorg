import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonValidationError, readJsonBody } from "@/lib/api/http";
import { AI_NOT_CONFIGURED } from "@/lib/ai/errors";
import {
  MAX_CONTEXT_CHARS,
  MAX_HISTORY_CHARS,
  trimHistory,
} from "@/lib/ai/limits"; // new
import { checkRateLimit } from "@/lib/ai/rate-limit";
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
  if (!env.AI_WORKER_SECRET) {
    return NextResponse.json(
      { error: "AI is not configured", code: AI_NOT_CONFIGURED },
      { status: 503 },
    );
  }

  // 2b. is this user asking too fast?
  try {
    const limit = await checkRateLimit({
      key: `ai:rl:${session.userId}`,
      limit: env.AI_RATE_LIMIT_PER_MINUTE,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `You're asking too fast. Try again in ${limit.retryAfterSeconds}s.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
  } catch (error) {
    // Redis down: let the request through. The provider's spend cap is the backstop.
    console.warn("[ai] rate limiter unavailable, allowing request", error);
  }

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

  // 4b. too much data for the model to read in one go
  if (pageContext.length > MAX_CONTEXT_CHARS) {
    return jsonError(
      413,
      "This page has too much data for the assistant to read at once. Try a more specific page, such as a single team or person.",
    );
  }

  // 5. forward to the worker
  let upstream: Response;
  try {
    upstream = await fetch(`${env.AI_WORKER_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": env.AI_WORKER_SECRET,
      },
      body: JSON.stringify({
        question,
        page_context: pageContext,
        history: trimHistory(history, MAX_HISTORY_CHARS),
      }),
      signal: request.signal,
    });
  } catch {
    return jsonError(502, "The AI service is unavailable.");
  }
  if (!upstream.ok || !upstream.body) {
    return jsonError(502, "The AI service is unavailable.");
  }

  // 6. pipe the stream straight through, telling the UI which kind of model
  // answered. Only the two known values are passed on, never the raw header.
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
  };
  const provider = upstream.headers.get("X-LLM-Provider");
  if (provider === "local" || provider === "hosted") {
    headers["X-LLM-Provider"] = provider;
  }
  return new Response(upstream.body, { headers });
}
