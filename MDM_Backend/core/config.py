"""
core/config.py
--------------
Centralised application settings loaded from the .env file.
Import `settings` anywhere in the codebase to access typed config values.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = Field(
        default="postgresql://postgres:2025@localhost:5432/SignalMDM",
        env="DATABASE_URL",
    )

    # Security
    jwt_secret: str = Field(default="supersecretkey", env="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=1440, env="JWT_EXPIRE_MINUTES")
    token_encryption_key: str = Field(
        default="",
        env="TOKEN_ENCRYPTION_KEY",
        description="64 hex chars = 32 bytes AES-256 key. Generate: python -c 'import secrets; print(secrets.token_hex(32))'",
    )

    # Celery / Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    celery_enabled: bool = Field(default=True, env="CELERY_ENABLED")

    # App
    app_env: str = Field(default="development", env="APP_ENV")
    upload_dir: str = Field(default="storage/uploads", env="UPLOAD_DIR")
    app_title: str = "SignalMDM API"
    app_version: str = "1.0.0"

    # SMTP — Email OTP delivery
    smtp_host: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: str = Field(default="", env="SMTP_USERNAME")
    smtp_password: str = Field(default="", env="SMTP_PASSWORD")
    smtp_from: str = Field(default="", env="SMTP_FROM")
    smtp_use_tls: bool = Field(default=True, env="SMTP_USE_TLS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — safe to call anywhere."""
    return Settings()


# Convenience singleton
settings = get_settings()
