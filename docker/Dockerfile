# Multi-stage build for the TanStack Start app, served by Node via scripts/vps-server.mjs.
# Stage 1: install deps with bun, then run the Vite build with Node.
# Running the build under Node avoids Bun/overlayfs timestamp churn that can make
# TanStack Router repeatedly rewrite routeTree.gen.ts during Docker builds.
FROM node:22-alpine AS builder
WORKDIR /app
ARG BUN_VERSION=1.3.3

RUN npm install -g bun@${BUN_VERSION}

# Cache deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Copy source + build
COPY . .
RUN rm -f src/routeTree.gen.ts && node ./node_modules/vite/bin/vite.js build

# Stage 2: lean Node runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ARG BUN_VERSION=1.3.3

# Install prod deps for the Node launcher (dotenv etc.)
COPY package.json bun.lock ./
RUN npm install -g bun@${BUN_VERSION} && bun install --production --frozen-lockfile || bun install --production

# Copy built output (dist/client + dist/server) and launcher
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts/vps-server.mjs ./scripts/vps-server.mjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "scripts/vps-server.mjs"]
