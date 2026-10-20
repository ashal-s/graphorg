"""GraphOrg AI worker.

Day 1 scaffold: a health-checked FastAPI app proving the Python workspace
starts locally. Embeddings, retrieval and evaluation endpoints are built out
in WEB-158 (Days 10-12), invoked by apps/web over a typed internal contract —
this service has no public HTTP surface once deployed.
"""

from fastapi import FastAPI

from ai_worker.chat import router as chat_router
from ai_worker.otel import instrument_app, setup_otel

setup_otel()

app = FastAPI(title="GraphOrg AI Worker")
app.include_router(chat_router)
instrument_app(app)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
