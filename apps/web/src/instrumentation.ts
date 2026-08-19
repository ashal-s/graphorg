export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("./lib/env");
    console.info(`[graphorg] environment validated (NODE_ENV=${env.NODE_ENV})`);
  }
}
