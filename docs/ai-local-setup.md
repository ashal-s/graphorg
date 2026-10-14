# Local AI setup

GraphOrg's AI worker can run against a local model through Ollama.

## Install and run

1. Install Ollama from https://ollama.com
2. Start the server (keep this terminal open):
   ```
   ollama serve
   ```
3. In a second terminal, pull the models:
   ```
   ollama pull qwen2.5:7b-instruct   # ~4.7 GB, default
   ollama pull qwen2.5:3b            # smaller, faster while developing
   ```

## Check it works

```
curl localhost:11434/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"Say hi"}]}'
```

## Point the worker at it

In `services/ai-worker/.env`:

```
LLM_PROVIDER=local
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b-instruct
```

## Notes

- The first request is slow while the model loads into memory.
- On 16 GB machines, close memory-heavy apps or use the 3b model.
