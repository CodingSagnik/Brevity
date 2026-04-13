# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Install only production OS deps needed at runtime
RUN apk add --no-cache curl

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─── Development ──────────────────────────────────────────────────────────────
# Mounts the host source via docker-compose volume; nodemon watches for changes
FROM base AS development
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ─── Production ───────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Drop to non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 5000
CMD ["node", "server.js"]
