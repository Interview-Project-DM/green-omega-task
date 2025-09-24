FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

RUN apt-get update && apt-get install -y git && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the current directory (apps/api) to /app
COPY . .

# Install dependencies
RUN uv sync --locked --no-cache --no-dev

# Add the current directory to Python path
ENV PYTHONPATH=/app

EXPOSE 8000
CMD ["uv", "run", "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000"]