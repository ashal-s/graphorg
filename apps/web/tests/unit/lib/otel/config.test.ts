import {
  DEFAULT_OTEL_OTLP_ENDPOINT,
  getOtelOtlpEndpoint,
  getOtelServiceName,
  isOtelConfigured,
  otelEndpointOrigin,
} from "@/lib/otel/config";

describe("otel config", () => {
  const originalEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const originalName = process.env.OTEL_SERVICE_NAME;

  afterEach(() => {
    if (originalEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEndpoint;
    }
    if (originalName === undefined) {
      delete process.env.OTEL_SERVICE_NAME;
    } else {
      process.env.OTEL_SERVICE_NAME = originalName;
    }
  });

  it("reports unconfigured when the endpoint is missing", () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(isOtelConfigured()).toBe(false);
    expect(getOtelOtlpEndpoint()).toBeUndefined();
  });

  it("reads the endpoint and defaults the service name", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = DEFAULT_OTEL_OTLP_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;

    expect(isOtelConfigured()).toBe(true);
    expect(getOtelOtlpEndpoint()).toBe(DEFAULT_OTEL_OTLP_ENDPOINT);
    expect(getOtelServiceName()).toBe("graphorg-web");
  });

  it("logs only the endpoint origin", () => {
    expect(
      otelEndpointOrigin("https://user:secret@otel.example.com:4318/v1/traces"),
    ).toBe("https://otel.example.com:4318");
    expect(otelEndpointOrigin("not a url")).toBeUndefined();
  });

  it("honours an override service name", () => {
    process.env.OTEL_SERVICE_NAME = "custom-web";
    expect(getOtelServiceName()).toBe("custom-web");
  });
});
