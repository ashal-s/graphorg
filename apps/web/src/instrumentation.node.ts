/**
 * Node-only OpenTelemetry NodeSDK. Imported from `instrumentation.ts` when
 * `NEXT_RUNTIME === "nodejs"` and `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
 * Not loaded on Edge (NodeSDK is incompatible).
 */
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

import {
  getOtelOtlpEndpoint,
  getOtelServiceName,
  isOtelConfigured,
} from "@/lib/otel/config";

if (isOtelConfigured()) {
  const endpoint = getOtelOtlpEndpoint()!;
  const url = endpoint.replace(/\/$/, "");

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: getOtelServiceName(),
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${url}/v1/traces`,
        }),
      ),
    ],
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${url}/v1/metrics`,
      }),
      exportIntervalMillis: 15_000,
    }),
  });

  sdk.start();

  const shutdown = () => {
    void sdk.shutdown().catch(() => {
      // Best-effort flush on exit.
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
