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
COPY backend/start.sh .
COPY backend/app ./app

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Use start.sh which properly handles $PORT variable
CMD ["./start.sh"]
