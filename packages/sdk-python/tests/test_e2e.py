"""End-to-end test against a real server over stdio.

Opt-in (requires a built server + seeded Highcharts cache + Chromium):

    RUN_PY_E2E=1  HIGHCHART_SERVER_CMD="node"  \
    HIGHCHART_SERVER_ARGS="dist/index.js"  pytest

Skipped by default so the suite stays offline-friendly.
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_PY_E2E") != "1",
    reason="set RUN_PY_E2E=1 (and a running-capable server) to run e2e",
)


@pytest.mark.asyncio
async def test_list_and_create() -> None:
    from highchart_mcp_sdk import HighchartClient

    command = os.environ.get("HIGHCHART_SERVER_CMD", "node")
    args = os.environ.get("HIGHCHART_SERVER_ARGS", "dist/index.js").split()

    async with HighchartClient.connect_stdio(command=command, args=args) as client:
        catalog = await client.list_chart_types()
        assert catalog["totalTypes"] == 70

        result = await client.create_chart(
            type="line", series=[{"name": "Rev", "data": [1, 2, 3]}]
        )
        assert result["constr"] == "chart"
        assert result["options"]["chart"]["type"] == "line"
