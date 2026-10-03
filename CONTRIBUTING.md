# Contributing

Thanks for considering a contribution. This is a small, focused project —
most useful contributions are small too.

## Setup

```bash
git clone https://github.com/hasnaintypes/highchart-mcp-server.git
cd highchart-mcp-server
npm ci
npm run build
npm test
```

Requires Node.js 20+. For the JS/TS SDK: `npm run build -w @highchart-mcp/sdk`
/ `npm test -w @highchart-mcp/sdk`. For the Python SDK: see
`packages/sdk-python/README.md`. For the marketing site (`web/`): it's a
separate pnpm workspace, `cd web && pnpm install && pnpm dev`.

## Before you open a PR

- `npm run build && npm test` must pass (this is what CI checks).
- If you changed observable behavior, update `README.md` and/or
  `docs/roadmap.md` / `docs/architecture.md` to match — stale docs are worse
  than no docs. See `CLAUDE.md` for the architecture reference if you're
  using an AI assistant to help write the change.
- If you changed a published package (`src/**` → `@highchart-mcp/server`,
  `packages/sdk-js/**` → `@highchart-mcp/sdk`, `packages/sdk-python/**` →
  `highchart-mcp-sdk`), bump its version per README § Versioning & Publishing.
  You don't need to publish it yourself — CI does that on merge to `master`.
- Keep commits small and conventional: `feat(scope): ...`, `fix(scope): ...`,
  `chore(scope): ...`, `docs: ...` — look at `git log` for examples.

## Code style

- ESM only, `import`/`export`, `.js` specifiers in TS imports (NodeNext).
- Strict TypeScript, avoid `any` (prefer `unknown` + narrowing).
- Zod v4 (`import { z } from 'zod/v4'`) — note the v3 API differs.
- Logging goes to stderr (`logger` in `src/utils/`) — never stdout, that's the
  STDIO transport's protocol channel.

## Adding a new chart type

See `CLAUDE.md` § "Adding a type", or `docs/architecture.md` § Chart engine —
it's a short, mechanical process (author/extend a family in
`src/charts/families/`, register it, the matrix test asserts it builds).

## Picking up an issue

Issues labeled `good first issue` are scoped for a first contribution.
`help wanted` means it's open and nobody's claimed it — comment on the issue
before starting significant work so effort isn't duplicated.

## Reporting a security issue

Don't open a public issue — see `SECURITY.md`.
