/**
 * Metric producers for the web NodeSDK.
 *
 * The OTLP metric reader only exports instruments something has registered.
 * Runtime metrics (event loop, heap) are recorded on each collection.
 * HTTP metrics record incoming and outgoing `http`/`https` request duration.
 *
 * Next.js loads `http` before `instrumentation.ts`, so the instrumentation's
 * require hook never sees it. Patch the already loaded module explicitly.
 */
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import type { InstrumentationModuleDefinition } from "@opentelemetry/instrumentation";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { createRequire } from "node:module";
import type { RequestOptions } from "node:http";

const require = createRequire(import.meta.url);

const loadedHttpModules = {
  http: require("http") as object,
  https: require("https") as object,
};

let httpPatches: InstrumentationModuleDefinition[] = [];

function ignoresOtlpExport(
  request: RequestOptions,
  otlpEndpoint: string,
): boolean {
  let target: URL;
  try {
    target = new URL(otlpEndpoint);
  } catch {
    return false;
  }
  const host = request.hostname ?? request.host?.split(":")[0];
  if (!host || host !== target.hostname) return false;
  const defaultPort = request.protocol === "https:" ? "443" : "80";
  const port = request.port ? String(request.port) : defaultPort;
  const expectedPort =
    target.port || (target.protocol === "https:" ? "443" : "80");
  return port === expectedPort;
}

function patchLoadedHttp(instrumentation: HttpInstrumentation) {
  httpPatches = instrumentation
    .getModuleDefinitions()
    .filter(
      (definition) => definition.name === "http" || definition.name === "https",
    );
  for (const definition of httpPatches) {
    const loaded =
      loadedHttpModules[definition.name as keyof typeof loadedHttpModules];
    definition.patch?.(loaded);
  }
}

/** Removes the preloaded HTTP patch. The NodeSDK process keeps it until exit. */
export function releaseWebHttpInstrumentation() {
  for (const definition of httpPatches) {
    const loaded =
      loadedHttpModules[definition.name as keyof typeof loadedHttpModules];
    definition.unpatch?.(loaded);
  }
  httpPatches = [];
}

export function createWebInstrumentations(otlpEndpoint: string) {
  const httpInstrumentation = new HttpInstrumentation({
    // Exporter calls to the collector are not application traffic.
    ignoreOutgoingRequestHook: (request) =>
      ignoresOtlpExport(request, otlpEndpoint),
  });
  patchLoadedHttp(httpInstrumentation);
  return [new RuntimeNodeInstrumentation(), httpInstrumentation];
}
