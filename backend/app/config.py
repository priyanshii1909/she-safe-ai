"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Cloud platforms (Render/Railway) set PORT automatically.
    host: str = "0.0.0.0"
    port: int = 8000

    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"

    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
