"""Light OpenTelemetry setup for the AI worker (WEB-223).

No-op when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is unset so local pytest /
uvicorn without a collector stay quiet.
"""

from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_configured = False


def _endpoint_origin(endpoint: str) -> str:
    """Scheme and host only. Drops userinfo so logs stay free of credentials."""
    parsed = urlparse(endpoint)
    if parsed.scheme and parsed.hostname:
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{parsed.hostname}{port}"
    return "configured"


def setup_otel() -> None:
    """Register OTLP HTTP exporters for traces + metrics if endpoint is set."""
    global _configured
    if _configured:
        return

    endpoint = (os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip()
    if not endpoint:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
            OTLPMetricExporter,
        )
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry import metrics
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:
        logger.warning(
            "OTEL_EXPORTER_OTLP_ENDPOINT is set but OpenTelemetry packages "
            "are missing; skip instrumentation"
        )
        return

    service_name = (
        os.getenv("OTEL_SERVICE_NAME") or ""
    ).strip() or "graphorg-ai-worker"
    resource = Resource.create({"service.name": service_name})
    base = endpoint.rstrip("/")

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{base}/v1/traces"))
    )
    trace.set_tracer_provider(tracer_provider)

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=f"{base}/v1/metrics"),
        export_interval_millis=15_000,
    )
    metrics.set_meter_provider(
        MeterProvider(resource=resource, metric_readers=[metric_reader])
    )

    _configured = True
    logger.info(
        "opentelemetry sdk started endpoint_origin=%s",
        _endpoint_origin(endpoint),
    )


def instrument_app(app: object) -> None:
    """Instrument FastAPI when OTel is configured."""
    if not (os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "").strip():
        return
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    except ImportError:
        logger.warning("opentelemetry-instrumentation-fastapi missing; skip")
        return
    FastAPIInstrumentor.instrument_app(app)  # type: ignore[arg-type]
