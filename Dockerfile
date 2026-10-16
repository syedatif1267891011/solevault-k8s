# ==========================================================
# SOLEVAULT DOCKERFILE
# Node 22 Alpine with native built-in SQLite support
# ==========================================================

FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests first for optimal Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts

# Copy application source code
COPY . .

# Ensure database directory exists with proper permissions
RUN mkdir -p database

# Expose server application port
EXPOSE 3000

# Add container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/products').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the SoleVault eCommerce server
CMD ["node", "server/server.js"]
