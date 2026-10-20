"""OTel setup must no-op without an endpoint."""

import os

from ai_worker.otel import setup_otel


def test_setup_otel_noop_without_endpoint(monkeypatch):
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_ENDPOINT", raising=False)
    # Must not raise when packages may or may not be installed.
    setup_otel()
    assert os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") in (None, "")
