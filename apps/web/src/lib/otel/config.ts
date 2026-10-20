/**
 * OpenTelemetry export config (traces + metrics).
 *
 * Lane: system performance instrumentation only. Sentry owns exceptions;
 * Better Stack owns uptime; PostHog owns product analytics / replay;
 * Grafana (WEB-224) owns dashboards on this data.
 *
 * No-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset. With the Compose
 * collector running, set it to `http://localhost:4318`.
 */
export const DEFAULT_OTEL_OTLP_ENDPOINT = "http://localhost:4318";

export function getOtelOtlpEndpoint(): string | undefined {
  return process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || undefined;
}

export function isOtelConfigured(): boolean {
  return Boolean(getOtelOtlpEndpoint());
}

export function getOtelServiceName(): string {
  return process.env.OTEL_SERVICE_NAME?.trim() || "graphorg-web";
}
