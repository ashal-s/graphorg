import json
from collections.abc import AsyncIterator
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.language_models.chat_models import BaseChatModel
from pydantic import BaseModel, Field

from ai_worker.config import get_settings
from ai_worker.llm import get_llm
from ai_worker.prompts import build_messages
from ai_worker.security import require_internal_secret

router = APIRouter(dependencies=[Depends(require_internal_secret)])


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    page_context: str
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)


def _sse(data: str, event: str | None = None) -> str:
    prefix = f"event: {event}\n" if event else ""
    return f"{prefix}data: {json.dumps(data)}\n\n"


@router.post("/chat")
async def chat(
    body: ChatRequest, llm: BaseChatModel = Depends(get_llm)
) -> StreamingResponse:
    messages = build_messages(
        body.question,
        body.page_context,
        [(m.role, m.content) for m in body.history],
    )

    async def stream() -> AsyncIterator[str]:
        try:
            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield _sse(str(chunk.content))
            yield _sse("", event="done")
        except Exception:
            yield _sse("The model request failed.", event="error")

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        # Lets the UI show whether this answer came from a local or hosted model.
        headers={"X-LLM-Provider": get_settings().llm_provider},
    )