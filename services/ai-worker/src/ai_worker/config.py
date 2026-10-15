"""Worker settings, read from environment variables and a local .env file."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llm_provider: Literal["local", "hosted"] = "local"
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    internal_secret: str

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
