# Backend image for Render (Linux). uv for fast, reproducible installs.
FROM python:3.13-slim

# uv: the dependency manager/runner used by this project.
RUN pip install --no-cache-dir uv

WORKDIR /app

# Install dependencies first (cached layer). --no-dev skips ruff/pytest.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# App code.
COPY . .

# Render provides $PORT. Bind 0.0.0.0 so the service is reachable.
# On Linux we use uvicorn directly (uvloop) — the Windows selector-loop
# workaround in run_server.py isn't needed here.
ENV HOST=0.0.0.0
CMD uv run alembic upgrade head && \
    uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
