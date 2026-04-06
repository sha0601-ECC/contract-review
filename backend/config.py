from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Provider selection: claude / deepseek / qwen / kimi / minimax / ollama / openai
    model_provider: str = "claude"

    # ----- Anthropic (Claude) -----
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-sonnet-4-6"

    # ----- OpenAI -----
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    # ----- DeepSeek -----
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-chat"

    # ----- Alibaba Qwen (DashScope) -----
    dashscope_api_key: Optional[str] = None
    qwen_model: str = "qwen-plus"

    # ----- Moonshot (Kimi) -----
    moonshot_api_key: Optional[str] = None
    kimi_model: str = "moonshot-v1-8k"

    # ----- MiniMax -----
    minimax_api_key: Optional[str] = None
    minimax_model: str = "MiniMax-Text-01"

    # ----- Ollama (Local) -----
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2-vision:latest"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
