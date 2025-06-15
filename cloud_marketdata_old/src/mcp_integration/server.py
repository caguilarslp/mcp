"""
Simple MCP Server Implementation for Cloud MarketData

Implementación MCP simple sin dependencias externas complejas.
Funciona de forma independiente y proporciona herramientas básicas.
"""

from typing import Dict, Any, List
import json
import asyncio
from datetime import datetime
import logging

from ..core.config import Settings
from ..core.logger import setup_logger

# Setup
settings = Settings()
logger = setup_logger(__name__)


class SimpleMCPServer:
    """
    Implementación MCP simple para Cloud MarketData
    
    Proporciona herramientas básicas sin dependencias complejas de MCP.
    Diseñada para funcionar de forma confiable y ser fácil de debuggear.
    """
    
    def __init__(self):
        """Initialize simple MCP server"""
        self.name = "Cloud MarketData Simple MCP"
        self.version = "0.1.0"
        self.tools = {
            "ping": {
                "handler": self.ping_tool,
                "description": "Test MCP connectivity with ping/pong response",
                "schema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Optional message to echo back",
                            "default": "Hello from Cloud MarketData!"
                        }
                    }
                }
            },
            "get_system_info": {
                "handler": self.system_info_tool,
                "description": "Get Cloud MarketData server system information and status",
                "schema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False
                }
            }
        }
        logger.info(f"✅ {self.name} initialized with {len(self.tools)} tools")
    
    async def ping_tool(self, arguments: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Ping tool for testing connectivity
        
        Args:
            arguments: Tool arguments containing optional message
            
        Returns:
            Dict with pong response and metadata
        """
        if arguments is None:
            arguments = {}
            
        message = arguments.get("message", "Hello from Cloud MarketData!")
        
        result = {
            "status": "pong",
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "server": f"{self.name} v{self.version}",
            "tool": "ping"
        }
        
        logger.info(f"🏓 Ping tool executed with message: {message}")
        return result
    
    async def system_info_tool(self, arguments: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        System information tool
        
        Returns:
            Dict with system information and server status
        """
        result = {
            "server_name": "Cloud MarketData MCP Server", 
            "version": self.version,
            "status": "operational",
            "available_tools": list(self.tools.keys()),
            "capabilities": {
                "market_data": "ready",
                "volume_profile": "coming_soon",
                "order_flow": "coming_soon",
                "mcp_integration": "simple_implementation"
            },
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.utcnow().isoformat(),
            "tool": "get_system_info"
        }
        
        logger.info("ℹ️ System info tool executed")
        return result
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List available tools
        
        Returns:
            List of tool definitions
        """
        tools_list = []
        for name, config in self.tools.items():
            tools_list.append({
                "name": name,
                "description": config["description"],
                "inputSchema": config["schema"]
            })
        
        logger.info(f"📋 Listed {len(tools_list)} available tools")
        return tools_list
    
    async def call_tool(self, name: str, arguments: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Call a specific tool
        
        Args:
            name: Tool name to call
            arguments: Tool arguments
            
        Returns:
            Tool execution result or error
        """
        logger.info(f"🔧 Tool call request: {name} with args: {arguments}")
        
        if name not in self.tools:
            error_result = {
                "error": f"Tool '{name}' not found",
                "available_tools": list(self.tools.keys()),
                "timestamp": datetime.utcnow().isoformat()
            }
            logger.error(f"❌ Tool not found: {name}")
            return error_result
        
        try:
            handler = self.tools[name]["handler"]
            result = await handler(arguments)
            
            logger.info(f"✅ Tool '{name}' executed successfully")
            return result
            
        except Exception as e:
            error_result = {
                "error": f"Error executing tool '{name}': {str(e)}",
                "tool": name,
                "timestamp": datetime.utcnow().isoformat()
            }
            logger.error(f"❌ Tool execution error: {name} - {e}")
            return error_result
    
    def get_server_info(self) -> Dict[str, Any]:
        """Get basic server information"""
        return {
            "name": self.name,
            "version": self.version,
            "tools_count": len(self.tools),
            "status": "running"
        }


def create_simple_mcp_server() -> SimpleMCPServer:
    """
    Create and configure simple MCP server instance
    
    Returns:
        SimpleMCPServer: Configured simple MCP server ready for use
    """
    logger.info("Creating simple MCP server...")
    server = SimpleMCPServer()
    logger.info("✅ Simple MCP server created successfully")
    return server


# Global server instance (singleton pattern)
_simple_mcp_server = None

def get_mcp_server() -> SimpleMCPServer:
    """
    Get the global simple MCP server instance (singleton pattern)
    
    Returns:
        SimpleMCPServer: The global simple MCP server instance
    """
    global _simple_mcp_server
    if _simple_mcp_server is None:
        _simple_mcp_server = create_simple_mcp_server()
    return _simple_mcp_server


# Compatibility functions for testing
async def run_stdio_server():
    """
    Placeholder for stdio server (for compatibility)
    """
    logger.info("🔌 Simple MCP server stdio mode...")
    logger.info("💡 This is a simple implementation - use HTTP endpoints for testing")
    
    server = get_mcp_server()
    
    # Simple demonstration
    logger.info("📱 Available tools:")
    tools = server.list_tools()
    for tool in tools:
        logger.info(f"  - {tool['name']}: {tool['description']}")
    
    logger.info("🏓 Testing ping tool...")
    ping_result = await server.call_tool("ping", {"message": "Test from stdio"})
    logger.info(f"📨 Ping result: {ping_result}")
    
    logger.info("ℹ️ Testing system info tool...")
    info_result = await server.call_tool("get_system_info")
    logger.info(f"📊 System info: {info_result}")
    
    logger.info("✅ Simple MCP server demonstration complete")
