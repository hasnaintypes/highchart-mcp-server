# Licensing

This project (the `highchart-mcp-server` code) is distributed under the license
named in `package.json`. **Highcharts itself is a separate, proprietary product**
and is **not** covered by this project's license.

## Highcharts license (important)

[Highcharts](https://www.highcharts.com/) (used here via
[`highcharts`](https://www.npmjs.com/package/highcharts) and
[`highcharts-export-server`](https://www.npmjs.com/package/highcharts-export-server))
is proprietary software owned by Highsoft AS.

- **Free for non-commercial use** under
  [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/), **provided the
  attribution credit is kept** (the small "Highcharts.com" link on each chart).
- **Commercial / production use requires a paid Highcharts license** purchased
  from Highsoft: <https://shop.highcharts.com/>. This includes internal business
  tools, SaaS, paid products, and most organizational use.

There is **no runtime license key** that unlocks Highcharts; compliance is a
legal/commercial matter. This server does not grant you any Highcharts license.

## How this server stays compliant by default

- **Credits attribution is ON by default** (`HIGHCHARTS_CREDITS_ENABLED=true`),
  satisfying the free/non-commercial attribution requirement.
- Credits can be **disabled only when you provide `HIGHCHARTS_LICENSE_ID`**
  (attesting you hold a valid license). Without it, the setting is forced back to
  `true`.
- On startup the server logs a licensing notice reflecting the active mode.

### Configuration

| Env var | Default | Effect |
| --- | --- | --- |
| `HIGHCHARTS_LICENSE_ID` | _(unset)_ | Records your Highcharts license id; required to disable credits. |
| `HIGHCHARTS_CREDITS_ENABLED` | `true` | Show/hide the Highcharts credit. Forced `true` unless a license id is set. |

## Your responsibility

If you deploy or use this server for any **commercial or production** purpose,
you must obtain and comply with an appropriate Highcharts license. The authors of
this open-source wrapper are not responsible for downstream license compliance.
