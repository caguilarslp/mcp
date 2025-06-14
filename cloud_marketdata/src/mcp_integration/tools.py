"""
MCP Tools for Cloud MarketData

Individual tool definitions that can be used independently or as part of the server.
"""

from typing import Dict, Any
from datetime import datetime
import logging

from ..core.logger import setup_logger

logger = setup_logger(__name__)


async def ping_tool(message: str = "Hello from Cloud MarketData!") -> Dict[str, Any]:
    """
    Simple ping tool for testing MCP connectivity
    
    This tool provides a basic ping/pong functionality to test MCP server
    connectivity and responsiveness.
    
    Args:
        message: Optional message to echo back (default: "Hello from Cloud MarketData!")
        
    Returns:
        Dict containing:
            - status: "pong" 
            - message: The original message
            - timestamp: Current UTC timestamp
            - server: Server identification
            
    Example:
        >>> result = await ping_tool("Test message")
        >>> print(result["status"])  # "pong"
    """
    logger.info(f"Ping tool called with message: {message}")
    
    result = {
        "status": "pong",
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "server": "Cloud MarketData MCP v0.1.0"
    }
    
    logger.debug(f"Ping tool returning: {result}")
    return result


async def system_info_tool() -> Dict[str, Any]:
    """
    Get system information tool
    
    Returns basic information about the Cloud MarketData server including
    version, status, and available capabilities.
    
    Returns:
        Dict containing:
            - server_name: Name of the server
            - version: Current version
            - status: Operational status
            - available_tools: List of available MCP tools
            - timestamp: Current UTC timestamp
            
    Example:
        >>> info = await system_info_tool()
        >>> print(info["version"])  # "0.1.0"
    """
    logger.info("System info tool called")
    
    result = {
        "server_name": "Cloud MarketData MCP Server",
        "version": "0.1.0",
        "status": "operational", 
        "available_tools": ["ping", "get_system_info"],
        "capabilities": {
            "market_data": "ready",
            "volume_profile": "coming_soon",
            "order_flow": "coming_soon"
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    logger.debug(f"System info tool returning: {result}")
    return result
