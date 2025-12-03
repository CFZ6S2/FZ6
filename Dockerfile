# Dockerfile for Railway deployment
# Build context: root directory
# Working directory: backend/

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code (entire backend directory)
COPY backend/ .

# Expose Cloud Run default port
EXPOSE 8080

# Start command compatible with Cloud Run (PORT env defaults to 8080)
ENTRYPOINT ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
