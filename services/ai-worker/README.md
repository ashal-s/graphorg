# AI worker

Python FastAPI service that builds the Ask AI prompt and streams completions from a local (Ollama) or hosted OpenAI-compatible model. Invoked only by `apps/web` (shared secret header); never exposed to the browser.

## Endpoints

- `GET /health` — liveness (no model required)
- `POST /chat` — SSE stream of the model reply (requires `X-Internal-Secret`)

## Local setup

Full walkthrough (Ollama, Redis, env vars, web app wiring, rate limits): [docs/ai-local-setup.md](../../docs/ai-local-setup.md).

Short version:

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # set INTERNAL_SECRET to match apps/web AI_WORKER_SECRET
uvicorn ai_worker.main:app --reload --port 8001
```

Tests: `pytest` (with the virtualenv active).
