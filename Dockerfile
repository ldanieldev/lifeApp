# Multi-stage build for Django + React single image
FROM python:3.13-bookworm AS builder

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs

# Build React frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Install Python dependencies
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.13-slim AS production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend application
COPY backend/ ./backend/

# Copy built frontend
COPY --from=builder /app/frontend/dist ./static/

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app && \
    chown -R app:app /var/log/nginx && \
    chown -R app:app /var/lib/nginx

# Collect Django static files
RUN cd backend && python manage.py collectstatic --noinput

EXPOSE 80

# Use supervisor to manage nginx + gunicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]