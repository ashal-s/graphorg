import { headers } from "next/headers";

import { checkRateLimit } from "@/lib/ai/rate-limit";

const LOGIN_IP_LIMIT = 5;
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_WINDOW_SECONDS = 60;

const SIGNUP_IP_LIMIT = 5;
const SIGNUP_EMAIL_LIMIT = 3;
const SIGNUP_WINDOW_SECONDS = 60 * 60;

/**
 * Client address from a platform header only. Client-supplied
 * X-Forwarded-For / X-Real-IP are ignored — without a configured trusted
 * proxy boundary they are attacker-controlled on a direct deployment.
 */
export function clientIpFromHeaders(headerStore: Headers): string | null {
  // Vercel sets this itself; it is not taken from a client-supplied header.
  const vercel = headerStore.get("x-vercel-forwarded-for");
  if (vercel) {
    const hop = vercel.split(",")[0]?.trim();
    if (hop) return hop;
  }
  return null;
}

async function enforce(
  checks: Array<{ key: string; limit: number; windowSeconds: number }>,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  try {
    // Count every bucket on each attempt so rotating IPs or emails still trip.
    const results = await Promise.all(
      checks.map((check) => checkRateLimit(check)),
    );
    const denied = results.filter((result) => !result.allowed);
    if (denied.length > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          ...denied.map((result) => result.retryAfterSeconds),
        ),
      };
    }
    return { allowed: true };
  } catch (error) {
    // Redis down: fail open so a cache outage does not block every sign-in.
    console.warn("[auth] rate limiter unavailable, allowing request", error);
    return { allowed: true };
  }
}

/** Throttles email-only and workspace login before expensive bcrypt work. */
export async function enforceLoginRateLimit(email: string) {
  const ip = clientIpFromHeaders(await headers());
  const checks: Array<{ key: string; limit: number; windowSeconds: number }> = [
    {
      key: `auth:login:email:${email}`,
      limit: LOGIN_EMAIL_LIMIT,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    },
  ];
  // Skip the IP bucket when no trusted address exists — a shared "unknown"
  // key would lock out every user after a few attempts.
  if (ip) {
    checks.push({
      key: `auth:login:ip:${ip}`,
      limit: LOGIN_IP_LIMIT,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    });
  }
  return enforce(checks);
}

/** Throttles public signup so unverified emails cannot flood workspaces. */
export async function enforceSignupRateLimit(email: string) {
  const ip = clientIpFromHeaders(await headers());
  const checks: Array<{ key: string; limit: number; windowSeconds: number }> = [
    {
      key: `auth:signup:email:${email}`,
      limit: SIGNUP_EMAIL_LIMIT,
      windowSeconds: SIGNUP_WINDOW_SECONDS,
    },
  ];
  if (ip) {
    checks.push({
      key: `auth:signup:ip:${ip}`,
      limit: SIGNUP_IP_LIMIT,
      windowSeconds: SIGNUP_WINDOW_SECONDS,
    });
  }
  return enforce(checks);
}
