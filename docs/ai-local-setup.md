# Local AI setup

The "Ask AI" panel on each page sends the page's context to a model and
streams the answer back. This guide runs everything on your machine, with
the model served locally by Ollama.

```
browser ──► apps/web /api/ai/chat ──► services/ai-worker /chat ──► Ollama (or a hosted model)
              auth, rate limit,         prompt + streaming          the LLM
              page context (Redis)
```

You need four things running: Redis, Ollama, the AI worker and the web app.

## 1. Ollama

1. Install Ollama from https://ollama.com
2. Start the server with a larger context window (keep this terminal open):
   ```
   OLLAMA_CONTEXT_LENGTH=8192 ollama serve
   ```
   Ollama defaults to 4096 tokens and silently drops anything past that, so
   a large page would be cut off with no error. 8192 fits comfortably in
   16 GB alongside the 7B model.

   If you run the Ollama menu-bar app instead of `ollama serve`, set it for
   the app and restart it:
   ```
   launchctl setenv OLLAMA_CONTEXT_LENGTH 8192
   ```
3. In a second terminal, pull the models:
   ```
   ollama pull qwen2.5:7b-instruct   # ~4.7 GB, default
   ollama pull qwen2.5:3b            # smaller, faster while developing
   ```

### Check it works

```
curl localhost:11434/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"Say hi"}]}'
```

## 2. Redis

The rate limiter keeps its counters in Redis. From the repo root:

```
docker compose up -d redis
```

## 3. The AI worker

The worker is the Python service that builds the prompt and talks to the
model. Run it from `services/ai-worker`.

First time only:

```
cd services/ai-worker
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
```

Edit `.env`:

```
INTERNAL_SECRET=<output of: openssl rand -hex 32>

LLM_PROVIDER=local
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b-instruct
```

`INTERNAL_SECRET` must match `AI_WORKER_SECRET` in `apps/web/.env.local`
(see step 4).

Every time you work on it (activate the virtualenv first in each new
terminal):

```
cd services/ai-worker
source .venv/bin/activate
uvicorn ai_worker.main:app --reload --port 8001
```

Port 8001 is what the web app expects by default (`AI_WORKER_URL`). Start it
from `services/ai-worker` so it finds `.env`.

Check it is up:

```
curl localhost:8001/health
# {"status":"ok"}
```

Run its tests with `python -m pytest`.

## 4. The web app

Add to `apps/web/.env.local`:

```
AI_WORKER_URL=http://localhost:8001
AI_WORKER_SECRET=<same value as INTERNAL_SECRET above>
```

Optional: `AI_RATE_LIMIT_PER_MINUTE=20` (see below). Restart the dev server
after editing `.env.local`, since Next only reads it at startup.

Then sign in, open any page and click the sparkle icon beside the copy
button. The badge beside "Ask AI" says whether a local or hosted model
answered.

## Costs and limits

Local models are free, but a hosted model is billed per token and the chat
is reachable by every signed-in user. These guards keep one user, or one
large page, from running up cost or exhausting the model's context window.

| Guard | Default | Where it lives |
| --- | --- | --- |
| Requests per user per minute | 20 | `AI_RATE_LIMIT_PER_MINUTE` in `apps/web/.env.local`; over the limit gets `429` with `Retry-After` |
| Page context size | 20,000 characters (about 5,000 tokens) | `MAX_CONTEXT_CHARS` in `apps/web/src/lib/ai/limits.ts`; over it gets `413` |
| Conversation history | 8,000 characters; oldest turns are dropped first | `MAX_HISTORY_CHARS` in the same file |
| Question length | 2,000 characters | route schema and the worker's `ChatRequest` |
| History length | 20 messages | route schema and the worker's `ChatRequest` |
| Answer length | 1,024 tokens | `max_tokens` in `services/ai-worker/src/ai_worker/llm.py` |
| Spend | Set in the provider's dashboard | see below |

Notes:

- **The rate limiter fails open.** If Redis is unreachable, requests are
  allowed through and a warning is logged, so a Redis outage doesn't take
  chat down. That is why the provider spend limit below matters.
- **The context budget is shared.** The model's window holds the system
  prompt, page data, history, question and the answer together, so the
  caps are set well under `OLLAMA_CONTEXT_LENGTH`.
- **Limits apply to local and hosted alike,** so behaviour doesn't change
  when you switch providers.

### Hosted models: set a spend cap

Before putting a hosted key in `.env`, set a hard ceiling in the provider's
own dashboard (for Fireworks, a monthly spend limit or a small prepaid
balance). Application limits can be bypassed by a bug or an outage; the
provider's limit cannot. Use a key made only for this project so it can be
revoked on its own.

To use a hosted model, switch the worker's `.env` to the hosted profile in
`.env.example` and restart it. No web app change is needed.

## Notes

- The first request is slow while the model loads into memory.
- On 16 GB machines, close memory-heavy apps or use the 3b model.
- Never commit `.env` files. `.env.example` is the template.
