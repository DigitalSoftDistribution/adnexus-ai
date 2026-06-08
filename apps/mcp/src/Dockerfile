# =============================================================================
# AdNexus MCP Server — Python Docker Build
# =============================================================================
# Lightweight Python 3.11-slim image for the Model Context Protocol server.
# Installs dependencies from requirements.txt for reproducible builds.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Production — single-stage Python runtime
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS production
WORKDIR /app

# Install system dependencies for any packages that need compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py ./
# Models and tools are runtime-extensible; create empty dirs as mount points
RUN mkdir -p models tools

# Expose the MCP server port
EXPOSE 8000

# Ensure Python output is unbuffered for proper logging
ENV PYTHONUNBUFFERED=1

# Health check for the MCP server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the MCP server
CMD ["python", "server.py"]
