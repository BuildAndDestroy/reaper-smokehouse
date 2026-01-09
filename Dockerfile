# Multi-stage Dockerfile for Reaper's Smokehouse
# Stage 1: Builder - Install all dependencies and prepare for build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files (package.json and package-lock.json)
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
# This allows for potential build steps, testing, linting, etc.
RUN npm ci

# Copy application source files
COPY . .

# At this stage, you could run:
# - npm run build (if you add a build script)
# - npm test (for running tests)
# - npm run lint (for linting)
# For now, we'll just prepare the dependencies

# Stage 2: Production - Only production dependencies and runtime
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files to install only production dependencies
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/css ./css
COPY --from=builder /app/js ./js
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/server.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]

