export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { env } = await import("./lib/env");
      console.info(
        `[graphorg] environment validated (NODE_ENV=${env.NODE_ENV})`,
      );
    } catch (error) {
      // Caught and logged directly, rather than left to propagate: zod's
      // ZodError defines `message` as a getter with no setter, which crashes
      // Next's dev error overlay (it tries to reassign `.message`) instead of
      // showing this validation error.
      console.error("[graphorg] invalid or missing environment variables.");
      console.error(
        "Copy apps/web/.env.example to apps/web/.env, fill in the values, and restart.",
      );
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  }
}
