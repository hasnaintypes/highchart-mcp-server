# Roadmap

**Done:** full chart-type coverage (all 70 Highcharts 12.x series types across
15 families), rendering/export to SVG/PNG/PDF, `list_chart_types` discovery,
offline Highcharts script cache, Prometheus metrics + `/health`, HTTP auth
(API key / HS256 JWT / GitHub OAuth) with scopes, token-bucket rate limiting,
per-session HTTP transport, export timeouts/worker pool/body-size/session
limits, Docker image + CI, `highchart-mcp` CLI, published JS/TS + Python
SDKs, and MCP `image` content blocks for svg/png renders (so clients like
Claude Desktop/claude.ai display the chart inline instead of raw SVG/base64
text — `src/utils/responseFormatter.ts`). See README.md for the full feature
list and `CLAUDE.md` for the authoritative architecture reference.

**Next — candidate ideas, not committed work:**

- Natural-language → chart config (turn a plain-English description into a
  validated `create_chart` call).
- AI chart-type suggestions / auto-correction of invalid configs.
- Dashboards / multi-chart layouts, scheduled or batch exports.
- Shared-store rate limiting for multi-replica deployments (currently
  per-process only).
- RS256/JWKS support for JWT auth (currently HS256 only).
- An `image`/`resource` content block for PDF exports (currently text/JSON
  base64 only — PDFs aren't realistically inline-previewable the way svg/png
  are).

Open an issue or PR if you want to pick one of these up — none are in
progress.
