# Security Policy

## Reporting a vulnerability

Please **don't** open a public GitHub issue for a security vulnerability.

Instead, use [GitHub Security Advisories](https://github.com/hasnaintypes/highchart-mcp-server/security/advisories/new)
to report it privately. Include:

- A description of the vulnerability and its impact.
- Steps to reproduce (a minimal repro is ideal).
- Affected version(s).

You should get an initial response within a few days. Once a fix is ready,
it'll be released and the advisory published with credit, unless you'd
prefer to stay anonymous.

## Scope

This covers the `@highchart-mcp/server` package, the `highchart-mcp` CLI, and
the `@highchart-mcp/sdk` / `highchart-mcp-sdk` client libraries in this repo.
Vulnerabilities in third-party dependencies (Highcharts itself,
`highcharts-export-server`, Next.js, etc.) are best reported upstream, but
feel free to flag them here too if they materially affect this project — we
track dependency CVEs via Dependabot and address them as they come up.
