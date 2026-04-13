# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# ─── Development ──────────────────────────────────────────────────────────────
# The full source tree is bind-mounted by docker-compose at runtime, so we only
# install dependencies here. Vite's HMR server binds to 0.0.0.0 (configured in
# vite.config.js) so the hot-reload WebSocket is reachable from the host.
FROM base AS development
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ─── Build ────────────────────────────────────────────────────────────────────
# Produces an optimised static bundle in /app/dist.
# VITE_API_URL can be injected as a build-arg so CI/CD can target any backend:
#   docker build --build-arg VITE_API_URL=https://api.prod.example.com ...
FROM base AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Production (Nginx serves static files + proxies /api to backend) ─────────
# Only the compiled artefacts are copied — no Node.js, no source code.
# The total image size is ~25 MB (nginx:stable-alpine base).
FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fs http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
