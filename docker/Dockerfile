# Multi-stage build for the TanStack Start app, served by Node via scripts/vps-server.mjs.
# Stage 1: install deps with bun, then run the Vite build with Node.
# Running the build under Node avoids Bun/overlayfs timestamp churn that can make
# TanStack Router repeatedly rewrite routeTree.gen.ts during Docker builds.
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g bun@1.1.45

# Cache deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Copy source + build
COPY . .
ENV BUILD_TARGET=node
RUN rm -f src/routeTree.gen.ts && node ./node_modules/vite/bin/vite.js build

# Stage 2: lean Node runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy only what's needed to run
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/scripts/vps-server.mjs ./scripts/vps-server.mjs
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "scripts/vps-server.mjs"]
