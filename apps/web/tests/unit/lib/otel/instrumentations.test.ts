/**
 * @jest-environment node
 */
import http from "node:http";
import type { AddressInfo } from "node:net";

import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";

import {
  createWebInstrumentations,
  releaseWebHttpInstrumentation,
} from "@/lib/otel/instrumentations";

function metricNames(exporter: InMemoryMetricExporter): string[] {
  return exporter
    .getMetrics()
    .flatMap((resourceMetrics) => resourceMetrics.scopeMetrics)
    .flatMap((scopeMetrics) => scopeMetrics.metrics)
    .map((metric) => metric.descriptor.name);
}

describe("web metric instrumentations", () => {
  it("records runtime and HTTP server measurements", async () => {
    const exporter = new InMemoryMetricExporter(
      AggregationTemporality.CUMULATIVE,
    );
    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 60_000,
    });
    const provider = new MeterProvider({ readers: [reader] });
    const instrumentations = createWebInstrumentations("http://127.0.0.1:4318");

    const server = http.createServer((_request, response) => {
      response.statusCode = 204;
      response.end();
    });

    try {
      for (const instrumentation of instrumentations) {
        instrumentation.enable();
        instrumentation.setMeterProvider(provider);
      }

      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve());
      });
      const { port } = server.address() as AddressInfo;
      await new Promise<void>((resolve, reject) => {
        const request = http.get(
          `http://127.0.0.1:${port}/health`,
          (response) => {
            response.resume();
            response.on("end", () => resolve());
          },
        );
        request.on("error", reject);
      });

      await provider.forceFlush();

      const names = metricNames(exporter);
      expect(names).toEqual(
        expect.arrayContaining([
          "nodejs.eventloop.utilization",
          "v8js.memory.heap.used",
          "http.server.request.duration",
        ]),
      );
    } finally {
      for (const instrumentation of instrumentations) {
        instrumentation.disable();
      }
      releaseWebHttpInstrumentation();
      await provider.shutdown();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
});
