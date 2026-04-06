import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    model_mode: str = "online"  # "local" or "online"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2-vision:latest"
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
