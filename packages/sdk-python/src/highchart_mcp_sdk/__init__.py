"""Python client SDK for the Highcharts MCP server."""

from __future__ import annotations

from .client import HighchartClient
from .errors import HighchartToolError

__all__ = ["HighchartClient", "HighchartToolError", "__version__"]
__version__ = "0.1.0"
