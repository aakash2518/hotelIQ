FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/observability/package*.json ./packages/observability/
COPY packages/agents/package*.json ./packages/agents/
COPY packages/pipelines/package*.json ./packages/pipelines/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build packages
WORKDIR /app/packages/observability
RUN npm run build

WORKDIR /app/packages/agents  
RUN npm run build

WORKDIR /app/packages/pipelines
RUN npm run build

WORKDIR /app/apps/api
RUN npm run build

# Set up runtime
WORKDIR /app/apps/api
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]