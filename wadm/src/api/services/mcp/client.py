"""MCP Client using FastMCP for communication with MCP Server.

This client communicates with the MCP Server running in a separate Docker container
via HTTP wrapper. NO MOCKS, NO PLACEHOLDERS - REAL COMMUNICATION.
"""

import os
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from .models import MCPResponse, MCPError, MCPHealthStatus, MCPToolInfo


logger = logging.getLogger(__name__)


class MCPClient:
    """Client for communicating with MCP Server via HTTP wrapper.
    
    The MCP Server runs in a separate Docker container with an HTTP wrapper
    that bridges HTTP requests to the MCP stdio protocol.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        """Initialize MCP Client.
        
        Args:
            base_url: Base URL of MCP Server. Defaults to MCP_SERVER_URL env var.
        """
        self.base_url = base_url or os.getenv("MCP_SERVER_URL", "http://mcp-server:3000")
        self.timeout = httpx.Timeout(60.0, connect=10.0)  # 60s timeout for complex analyses
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)
        
        logger.info(f"MCP Client initialized with server at: {self.base_url}")
    
    async def call_tool(self, tool_name: str, params: Dict[str, Any], session_id: Optional[str] = None) -> MCPResponse:
        """Call an MCP tool via HTTP wrapper.
        
        This communicates with the real MCP Server that has 119+ analysis tools.
        """
        start_time = datetime.utcnow()
        
        try:
            # Prepare request for MCP server
            if tool_name == "tools/list":
                # Special case for listing tools
                request_data = {
                    "method": "tools/list",
                    "params": None
                }
            else:
                # Tool call with proper MCP structure
                request_data = {
                    "method": "tools/call",
                    "params": {
                        "name": tool_name,
                        "arguments": params
                    }
                }
            
            # Call MCP server via HTTP wrapper
            response = await self._client.post(
                "/mcp/call",
                json=request_data
            )
            response.raise_for_status()
            
            result = response.json()
            
            if not result.get("success"):
                raise MCPError(
                    code=-32603,
                    message=result.get("error", "Unknown error from MCP server")
                )
            
            # Extract actual result
            mcp_result = result.get("result", {})
            
            # Calculate execution time
            execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Estimate token usage (rough estimate: 1 token per 4 characters)
            import json
            result_str = json.dumps(mcp_result)
            tokens_used = len(result_str) // 4
            
            return MCPResponse(
                success=True,
                data=mcp_result,
                session_id=session_id,
                tokens_used=tokens_used,
                execution_time_ms=execution_time_ms,
                tool=tool_name
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error calling MCP tool {tool_name}: {e}")
            return MCPResponse(
                success=False,
                error=MCPError(
                    code=e.response.status_code,
                    message=f"HTTP {e.response.status_code}: {e.response.text}"
                ),
                session_id=session_id,
                tokens_used=0,
                execution_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000),
                tool=tool_name
            )
            
        except Exception as e:
            logger.error(f"Error calling MCP tool {tool_name}: {e}")
            return MCPResponse(
                success=False,
                error=MCPError(
                    code=-32603,
                    message=str(e)
                ),
                session_id=session_id,
                tokens_used=0,
                execution_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000),
                tool=tool_name
            )
    
    async def get_health(self) -> MCPHealthStatus:
        """Check MCP server health via HTTP wrapper."""
        try:
            response = await self._client.get("/health")
            response.raise_for_status()
            
            data = response.json()
            
            return MCPHealthStatus(
                healthy=data.get("status") == "healthy",
                version="1.10.1",  # From MCP server package.json
                tools_count=data.get("tools_count", 0),
                process_running=data.get("mcp_running", False)
            )
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return MCPHealthStatus(
                healthy=False,
                version="unknown",
                tools_count=0,
                process_running=False,
                error=str(e)
            )
    
    async def list_tools(self) -> List[MCPToolInfo]:
        """Get list of available tools from MCP Server."""
        try:
            response = await self._client.get("/mcp/tools")
            response.raise_for_status()
            
            data = response.json()
            tools_data = data.get("tools", [])
            
            tools = []
            for tool_data in tools_data:
                # Extract parameters from inputSchema
                input_schema = tool_data.get("inputSchema", {})
                parameters = input_schema.get("properties", {})
                
                # Create simplified parameter description
                param_desc = {}
                for param_name, param_info in parameters.items():
                    param_type = param_info.get("type", "unknown")
                    param_desc[param_name] = f"{param_type}"
                    if param_info.get("default") is not None:
                        param_desc[param_name] += f" (default: {param_info['default']})"
                    elif param_name in input_schema.get("required", []):
                        param_desc[param_name] += " (required)"
                    else:
                        param_desc[param_name] += " (optional)"
                
                tools.append(MCPToolInfo(
                    name=tool_data.get("name", ""),
                    description=tool_data.get("description", ""),
                    parameters=param_desc,
                    category=self._categorize_tool(tool_data.get("name", ""))
                ))
            
            logger.info(f"Listed {len(tools)} MCP tools from server")
            return tools
            
        except Exception as e:
            logger.error(f"Failed to list tools: {e}")
            return []
    
    def _categorize_tool(self, tool_name: str) -> str:
        """Categorize tool based on name."""
        name_lower = tool_name.lower()
        
        if "wyckoff" in name_lower:
            return "wyckoff"
        elif "smart_money" in name_lower or "smc" in name_lower or "_order_block" in name_lower or "fair_value" in name_lower:
            return "smc"
        elif "volume" in name_lower:
            return "volume"
        elif "technical" in name_lower or "fibonacci" in name_lower or "bollinger" in name_lower or "elliott" in name_lower:
            return "technical"
        elif "multi_exchange" in name_lower or "aggregated" in name_lower or "exchange" in name_lower:
            return "multi_exchange"
        elif "support" in name_lower or "resistance" in name_lower:
            return "levels"
        elif "grid" in name_lower:
            return "trading"
        elif "volatility" in name_lower:
            return "volatility"
        elif "context" in name_lower or "master_context" in name_lower:
            return "context"
        elif "historical" in name_lower:
            return "historical"
        elif "trap" in name_lower:
            return "traps"
        elif "liquidation" in name_lower or "cascade" in name_lower:
            return "risk"
        elif "get_" in name_lower or "market_data" in name_lower:
            return "market_data"
        else:
            return "other"
    
    async def close(self):
        """Close HTTP client."""
        await self._client.aclose()
