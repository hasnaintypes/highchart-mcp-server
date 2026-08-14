"""Errors for the Highcharts MCP SDK."""

from __future__ import annotations


class HighchartToolError(Exception):
    """Raised when an MCP tool call returns an error result."""

    def __init__(self, tool: str, message: str) -> None:
        super().__init__(message)
        self.tool = tool
