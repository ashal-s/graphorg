import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from ai_worker.config import get_settings
from ai_worker.llm import get_llm
from ai_worker.main import app

SECRET = "test-secret"
BODY = {"question": "Hi?", "page_context": "{}", "history": []}


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://unused")
    monkeypatch.setenv("LLM_API_KEY", "x")
    monkeypatch.setenv("LLM_MODEL", "fake")
    monkeypatch.setenv("INTERNAL_SECRET", SECRET)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
    app.dependency_overrides.clear()


def test_rejects_missing_secret():
    client = TestClient(app)
    assert client.post("/chat", json=BODY).status_code == 401


def test_streams_tokens():
    fake = GenericFakeChatModel(messages=iter([AIMessage(content="Hello there")]))
    app.dependency_overrides[get_llm] = lambda: fake
    client = TestClient(app)
    res = client.post("/chat", json=BODY, headers={"X-Internal-Secret": SECRET})
    assert res.status_code == 200
    assert '"Hello"' in res.text and "event: done" in res.text

def test_reports_the_provider_in_a_header(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "hosted")
    get_settings.cache_clear()
    fake = GenericFakeChatModel(messages=iter([AIMessage(content="Hi")]))
    app.dependency_overrides[get_llm] = lambda: fake
    client = TestClient(app)
    res = client.post("/chat", json=BODY, headers={"X-Internal-Secret": SECRET})
    assert res.headers["x-llm-provider"] == "hosted"
