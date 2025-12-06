<<<<<<< HEAD
# Root Dockerfile to build and run the FastAPI backend from backend/
FROM python:3.11-slim

WORKDIR /app

# System deps (if needed for some Python packages)
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/. .

# Expose default port
EXPOSE 8080

# Start uvicorn reading PORT provided by the platform
CMD ["sh","-c","uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
=======
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

# Copy backend application code
# Copy backend application code
COPY backend/ .

# Expose port
EXPOSE 8000

# Start command compatible with Cloud Run (uses PORT env var)
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
