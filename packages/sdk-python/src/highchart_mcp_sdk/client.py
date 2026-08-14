"""Typed async client for the Highcharts MCP server.

The ``mcp`` client library is imported lazily inside the connect methods so the
package can be imported (and unit-tested) without the dependency installed.
"""

from __future__ import annotations

import json
from contextlib import AsyncExitStack, asynccontextmanager
from typing import Any, AsyncIterator, Mapping, Optional, Sequence

from .errors import HighchartToolError


def _extract_text(result: Any) -> str:
    for item in getattr(result, "content", None) or []:
        text = getattr(item, "text", None)
        if text is not None:
            return str(text)
    return ""


class HighchartClient:
    """Ergonomic wrapper around an initialized MCP ``ClientSession``."""

    def __init__(self, session: Any) -> None:
        self._session = session

    # ---- connection factories (async context managers) ----

    @classmethod
    @asynccontextmanager
    async def connect_stdio(
        cls,
        command: str,
        args: Optional[Sequence[str]] = None,
        env: Optional[Mapping[str, str]] = None,
    ) -> AsyncIterator["HighchartClient"]:
        """Spawn the server over stdio and yield a connected client."""
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        params = StdioServerParameters(
            command=command,
            args=list(args or []),
            env=dict(env) if env is not None else None,
        )
        async with AsyncExitStack() as stack:
            read, write = await stack.enter_async_context(stdio_client(params))
            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            yield cls(session)

    @classmethod
    @asynccontextmanager
    async def connect_http(
        cls,
        url: str,
        api_key: Optional[str] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> AsyncIterator["HighchartClient"]:
        """Connect to a running server over Streamable HTTP."""
        from mcp import ClientSession
        from mcp.client.streamable_http import streamablehttp_client

        hdrs: dict[str, str] = dict(headers or {})
        if api_key:
            hdrs["Authorization"] = f"Bearer {api_key}"
        async with AsyncExitStack() as stack:
            read, write, _ = await stack.enter_async_context(
                streamablehttp_client(url, headers=hdrs or None)
            )
            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            yield cls(session)

    # ---- tool calls ----

    async def _call(self, tool: str, args: Mapping[str, Any]) -> Any:
        result = await self._session.call_tool(tool, dict(args))
        text = _extract_text(result)
        if getattr(result, "isError", False):
            raise HighchartToolError(tool, text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    async def create_chart(self, **chart_input: Any) -> Any:
        """Build a config for a chart type, e.g. ``create_chart(type="line", series=[...])``.

        Returns ``{"constr", "options"}`` (or a render result if ``format`` is set).
        """
        return await self._call("create_chart", chart_input)

    async def render_chart(
        self,
        chart_options: Mapping[str, Any],
        format: Optional[str] = None,
        constr: Optional[str] = None,
    ) -> Any:
        args: dict[str, Any] = {"chartOptions": dict(chart_options)}
        if format is not None:
            args["format"] = format
        if constr is not None:
            args["constr"] = constr
        return await self._call("render_chart", args)

    async def export_chart(
        self,
        chart_options: Mapping[str, Any],
        format: str,
        constr: Optional[str] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
        scale: Optional[float] = None,
    ) -> Any:
        args: dict[str, Any] = {"chartOptions": dict(chart_options), "format": format}
        for key, value in (("constr", constr), ("width", width), ("height", height), ("scale", scale)):
            if value is not None:
                args[key] = value
        return await self._call("export_chart", args)

    async def list_chart_types(self, family: Optional[str] = None) -> Any:
        args: dict[str, Any] = {}
        if family is not None:
            args["family"] = family
        return await self._call("list_chart_types", args)
