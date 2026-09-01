# Deployment

This server supports two transports. Pick based on **who calls it**.

## 1. Local (STDIO) — for a single desktop AI client

Best for Claude Desktop, Cursor, VS Code, etc. No hosting needed; the client
launches the process over stdio.

```jsonc
// Example MCP client config (see mcp.json)
{
  "mcpServers": {
    "highchart": {
      "command": "node",
      "args": ["C:/path/to/highchart-mcp-server/dist/index.js"],
      "env": { "TRANSPORT": "stdio" }
    }
  }
}
```

Build first: `npm ci && npm run build`. STDIO is local and trusted — no auth.

## 2. Networked (HTTP) — for shared/multi-user access

Run the container and expose `/mcp` (JSON-RPC), `/health`, `/metrics`.

```bash
# from repo root
docker build -t highchart-mcp-server .
docker run -p 3000:3000 \
  -e TRANSPORT=http \
  -e AUTH_STRATEGY=apikey \
  -e API_KEYS="client1:$(openssl rand -hex 16):charts:render" \
  -e RATE_LIMIT_ENABLED=true \
  --shm-size=512m \
  highchart-mcp-server
# or: docker compose -f docker/docker-compose.yml up --build
```

**Always enable auth + rate limiting for any network exposure** and terminate
TLS at a reverse proxy (nginx/Caddy/Traefik) or the platform's load balancer.

### Where to host it

The container is a **long-lived Node process** running headless Chromium, so it
needs a container/VM platform (not a short-lived FaaS):

| Platform | Notes |
| --- | --- |
| **Fly.io / Railway / Render** | Easiest: deploy the Dockerfile directly. Set env vars in the dashboard. |
| **Google Cloud Run** | Works as a container; set **min instances ≥ 1** (avoid cold starts), ~1 vCPU / 1 GiB, and it honors `PORT`. |
| **AWS ECS/Fargate, Azure Container Apps** | Standard container deploy behind an ALB/ingress. |
| **Kubernetes** | Deploy the image; add a Service + Ingress; set resource requests/limits and `emptyDir` medium=Memory for `/dev/shm`. |
| **Plain VM (EC2, Hetzner, DigitalOcean)** | `docker compose up -d` behind nginx/Caddy for TLS. Simplest to reason about. |

### Resource guidance

- **Memory:** ~512 MB–1 GB (Chromium is the driver). Scale with `EXPORT_MAX_WORKERS`.
- **/dev/shm:** give Chromium room — `--shm-size=512m` (compose sets this). The
  image also passes `--disable-dev-shm-usage` via `PUPPETEER_ARGS`.
- **CPU:** rendering is CPU-bound; 1 vCPU handles light load, scale out for more.
- **Scaling:** rate limiting is per-process; for multiple replicas use a shared
  store (e.g. Redis) — not built in yet.

### Key environment variables

See `.env.example` for the full list. Most important for production:

- `TRANSPORT=http`, `PORT`
- `AUTH_STRATEGY` (`apikey`/`jwt`), `API_KEYS` or `JWT_SECRET`, `AUTH_REQUIRED_SCOPES`
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_RPM`, `RATE_LIMIT_BURST`
- `EXPORT_TIMEOUT_MS`, `EXPORT_MAX_WORKERS`, `HTTP_MAX_BODY_BYTES`, `HTTP_MAX_SESSIONS`
- `PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage` (containers)
- `HIGHCHARTS_LICENSE_ID` + `HIGHCHARTS_CREDITS_ENABLED` (commercial use — see LICENSING.md)

### Offline Highcharts scripts

The Docker image **bakes the Highcharts script cache at build time** from the
local `highcharts` package (no CDN dependency at runtime). Outside Docker, run
`npm run seed:cache` once, or set `HIGHCHARTS_CDN_URL` to the public CDN / your
mirror.

## Observability

- `GET /health` — liveness/readiness (status, version, uptime).
- `GET /metrics` — Prometheus metrics (protected unless `METRICS_PUBLIC=true`).
  Scrape with Prometheus; visualize in Grafana.
