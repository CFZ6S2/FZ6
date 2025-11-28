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
COPY backend/*.py .

# Expose port
EXPOSE 8000

# Start command will be overridden by Railway's startCommand
# Using ENTRYPOINT for better Railway compatibility
ENTRYPOINT ["uvicorn", "main:app", "--host", "0.0.0.0"]
CMD ["--port", "8000"]
