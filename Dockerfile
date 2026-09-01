# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-bookworm AS builder
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runtime

# Use the distro Chromium (smaller than Puppeteer's download) and skip the
# Puppeteer browser download during npm install.
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-crash-reporter,--disable-breakpad \
    TRANSPORT=http \
    PORT=3000 \
    HIGHCHARTS_CACHE_PATH=../../.hc-cache \
    HOME=/home/appuser \
    POOL_ACQUIRE_TIMEOUT=30000 \
    POOL_CREATE_TIMEOUT=30000 \
    EXPORT_TIMEOUT_MS=45000

# Chromium + fonts + CA certs (runtime libraries for headless rendering).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App build output + dev scripts (used to bake the Highcharts cache).
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

# Bake the Highcharts script cache OFFLINE from the installed `highcharts`
# package (no CDN needed at build or runtime).
RUN node scripts/seed-cache.mjs

# Run as a non-root user. Chromium's crashpad handler needs a writable $HOME
# to initialize its crash-dump database, so create a real home directory
# (a bare `--system` user has none, which makes crashpad fail to launch:
# "chrome_crashpad_handler: --database is required"). Belt-and-suspenders:
# also disable the crash reporter entirely via PUPPETEER_ARGS above.
RUN useradd --system --uid 10001 --create-home --home-dir /home/appuser appuser \
    && chown -R appuser:appuser /app /home/appuser
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
