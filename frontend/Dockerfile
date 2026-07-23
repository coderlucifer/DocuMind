# =============================================================================
# DocuMind Frontend — Dockerfile
# =============================================================================

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Expose
EXPOSE 3000

CMD ["npm", "start"]
