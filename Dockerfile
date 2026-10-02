FROM node:24-slim

# pnpm comes from corepack, pinned by "packageManager" in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

WORKDIR /app
RUN chown node:node /app
USER node

# Install dependencies first so this layer is cached until the lockfile changes.
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

CMD ["pnpm", "test"]
