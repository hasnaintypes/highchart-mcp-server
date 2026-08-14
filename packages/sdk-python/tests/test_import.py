"""Offline unit tests — no `mcp` install or running server required.

The `mcp` dependency is imported lazily inside the connect methods, so the
package imports cleanly and its surface can be checked without network.
"""

from __future__ import annotations

import inspect

from highchart_mcp_sdk import HighchartClient, HighchartToolError, __version__


def test_version() -> None:
    assert isinstance(__version__, str) and __version__


def test_error_carries_tool_name() -> None:
    err = HighchartToolError("create_chart", "bad type")
    assert err.tool == "create_chart"
    assert "bad type" in str(err)


def test_client_exposes_expected_methods() -> None:
    for name in ("create_chart", "render_chart", "export_chart", "list_chart_types"):
        assert callable(getattr(HighchartClient, name))
    for name in ("connect_stdio", "connect_http"):
        assert hasattr(HighchartClient, name)


def test_methods_are_async() -> None:
    assert inspect.iscoroutinefunction(HighchartClient.create_chart)
    assert inspect.iscoroutinefunction(HighchartClient.list_chart_types)
