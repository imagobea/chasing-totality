# Build from the repo root so the workspace files and lockfile are in the context:
#   docker build -f web/Dockerfile --target runtime .
FROM node:24-slim AS base

# pnpm comes from corepack, pinned by "packageManager" in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

WORKDIR /app
RUN chown node:node /app
USER node

# Install dependencies first so this layer is cached until the lockfile changes.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node web/package.json ./web/


# Development: Vite dev server with reload, listening on all interfaces so the host can reach it.
FROM base AS dev
RUN pnpm install --frozen-lockfile --filter web
COPY --chown=node:node web ./web
EXPOSE 5173
CMD ["pnpm", "--filter", "web", "dev", "--host", "0.0.0.0"]


# Compiles web/ to web/dist.
FROM dev AS build
RUN pnpm --filter web build


# Production: static files served by nginx, which also forwards /api to the API.
FROM nginx:alpine AS runtime
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
