# highchart-mcp-sdk (Python)

Async Python client for the [Highcharts MCP server](../../README.md).

## Install

```bash
pip install highchart-mcp-sdk        # (not yet published)
# from source:
pip install -e packages/sdk-python
```

## Usage

```python
import asyncio
from highchart_mcp_sdk import HighchartClient

async def main():
    # Spawn the server over stdio...
    async with HighchartClient.connect_stdio(command="node", args=["dist/index.js"]) as client:
        catalog = await client.list_chart_types()

        cfg = await client.create_chart(
            type="line",
            title="Sales",
            xAxisCategories=["Jan", "Feb", "Mar"],
            series=[{"name": "Revenue", "data": [10, 20, 15]}],
        )

        svg = await client.render_chart(
            {"chart": {"type": "candlestick"}, "series": [{"data": [[1, 2, 3, 1, 2]]}]},
            format="svg",
            constr="stockChart",
        )

    # ...or connect to a running HTTP server:
    # async with HighchartClient.connect_http("http://localhost:3000/mcp", api_key="...") as client:
    #     ...

asyncio.run(main())
```

## API

- `HighchartClient.connect_stdio(command, args=None, env=None)` — async context manager
- `HighchartClient.connect_http(url, api_key=None, headers=None)` — async context manager
- `create_chart(**input)` → dict (`{"constr", "options"}` or a render result)
- `render_chart(chart_options, format=None, constr=None)`
- `export_chart(chart_options, format, constr=None, width=None, height=None, scale=None)`
- `list_chart_types(family=None)`

Tool errors raise `HighchartToolError`.

## Tests

```bash
pip install -e "packages/sdk-python[test]"
pytest packages/sdk-python           # offline unit tests
RUN_PY_E2E=1 pytest packages/sdk-python   # end-to-end (needs a runnable server)
```
