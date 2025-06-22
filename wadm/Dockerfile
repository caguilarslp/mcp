# WADM Dockerfile - Production Ready
FROM python:3.12-slim

# Metadata
LABEL maintainer="WADM Team"
LABEL description="wAIckoff Data Manager - Smart Money Analysis System"
LABEL version="0.1.0"

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash wadm && \
    chown -R wadm:wadm /app
USER wadm

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/system/health || exit 1

# Expose port
EXPOSE 8000

# Default command - can be overridden
CMD ["python", "api_server.py"]
