"""GraphOrg AI worker.

Day 1 scaffold: a health-checked FastAPI app proving the Python workspace
starts locally. Embeddings, retrieval and evaluation endpoints are built out
in WEB-158 (Days 10-12), invoked by apps/web over a typed internal contract —
this service has no public HTTP surface once deployed.
"""

from fastapi import FastAPI

app = FastAPI(title="GraphOrg AI Worker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
