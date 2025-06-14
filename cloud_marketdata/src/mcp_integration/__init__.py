"""
MCP Integration module for Cloud MarketData

Simple MCP tools implementation without complex external dependencies.
"""

from .server import create_simple_mcp_server, get_mcp_server
from .tools import ping_tool, system_info_tool

__all__ = ["create_simple_mcp_server", "get_mcp_server", "ping_tool", "system_info_tool"]
