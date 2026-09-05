from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Resume Parsing Service"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx"}

    # Scoring weights — override via env vars (e.g. WEIGHT_SKILL_OVERLAP=0.35)
    # or via a values file once the evaluation notebook produces tuned weights.
    WEIGHT_SKILL_OVERLAP: float = 0.4
    WEIGHT_SEMANTIC_SIMILARITY: float = 0.4
    WEIGHT_EXPERIENCE_MATCH: float = 0.2

    model_config = SettingsConfigDict(
        env_file=".env"
    )


settings = Settings()