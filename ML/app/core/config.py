from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Resume Parsing Service"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx"}

    model_config = SettingsConfigDict(
        env_file=".env"
    )


settings = Settings()