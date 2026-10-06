FROM node:24-slim AS base

# pnpm comes from corepack, pinned by "packageManager" in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

WORKDIR /app
RUN chown node:node /app
USER node

# Install dependencies first so this layer is cached until the lockfile changes.
# The workspace files are needed too: pnpm reads the lockfile for every package listed there.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node web/package.json ./web/


# Development and tests: all dependencies, runs the test suite.
FROM base AS dev
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
CMD ["pnpm", "test"]


# Compiles src/ to dist/.
FROM dev AS build
RUN pnpm build


# Production API: prod dependencies and the compiled output only.
FROM base AS runtime
ENV NODE_ENV=production
# Only this package's dependencies (the "." filter), so React and Vite stay out of the API image
RUN pnpm install --frozen-lockfile --prod --filter .
COPY --from=build --chown=node:node /app/dist ./dist

# Node's fetch instead of curl, which the slim image doesn't have.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

EXPOSE 3000
CMD ["node", "dist/server/main.js"]
