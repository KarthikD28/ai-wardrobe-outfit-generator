from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WARDROBE_", env_file=BACKEND_DIR / ".env")

    database_url: str = f"sqlite:///{BACKEND_DIR / 'wardrobe.db'}"
    media_dir: Path = BACKEND_DIR / "media"
    secret_key: str = "dev-only-secret-change-me-before-deploying"
    token_ttl_hours: int = 24 * 7
    remove_backgrounds: bool = True
    max_upload_bytes: int = 15 * 1024 * 1024
    max_image_side: int = 1024


settings = Settings()
