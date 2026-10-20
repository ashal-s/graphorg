import pino from "pino";

/**
 * Server-side structured logger (Pino). Import only from Server Components,
 * Route Handlers, Server Actions, and Node instrumentation — not client
 * components.
 *
 * Does not call getEnv(): startup / env-validation failures must still be
 * able to log. Optional `LOG_LEVEL` (trace|debug|info|warn|error|fatal).
 *
 * Remains stdout/stderr only — Better Stack is uptime heartbeats, not a log
 * drain; OTel may bridge later (WEB-223).
 */
const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const isPretty =
  process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

export const logger = pino({
  level,
  base: { service: "graphorg-web" },
  ...(isPretty
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;
