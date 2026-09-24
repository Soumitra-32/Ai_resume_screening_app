FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download and cache the sentence-transformers model at build time so it
# doesn't need a network call on first request in production. Build offline
# with `--build-arg PRECACHE_MODEL=0`; the service then loads (and downloads)
# the model lazily on the first /health or scoring request instead.
ARG PRECACHE_MODEL=1
ENV HF_HOME=/app/.cache/huggingface
RUN if [ "$PRECACHE_MODEL" = "1" ]; then \
      python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"; \
    else \
      echo "Skipping model pre-cache; it will be downloaded on first use."; \
    fi

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]