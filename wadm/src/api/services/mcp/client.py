"""MCP Server Client using subprocess for direct communication."""

import asyncio
import json
import subprocess
import os
import time
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime
import logging

from .models import MCPResponse, MCPError, MCPHealthStatus, MCPToolInfo


logger = logging.getLogger(__name__)


class MCPClient:
    """Client for communicating with MCP Server via subprocess."""
    
    def __init__(self, mcp_server_path: Optional[str] = None):
        """Initialize MCP Client.
        
        Args:
            mcp_server_path: Path to MCP server directory. If None, uses relative path.
        """
        if mcp_server_path:
            self.mcp_path = Path(mcp_server_path)
        else:
            # Assume MCP server is in wadm/mcp_server
            self.mcp_path = Path(__file__).parent.parent.parent.parent.parent / "mcp_server"
            
        self.build_path = self.mcp_path / "build"
        self.index_js = self.build_path / "index.js"
        
        # Verify paths exist
        if not self.mcp_path.exists():
            raise MCPError(f"MCP server path not found: {self.mcp_path}")
            
        # Cache for tool information
        self._tools_cache: Optional[List[MCPToolInfo]] = None
        self._cache_time: Optional[datetime] = None
        self._cache_ttl = 3600  # 1 hour cache
        
    async def call_tool(self, tool_name: str, params: Dict[str, Any], session_id: Optional[str] = None) -> MCPResponse:
        """Call an MCP tool and return the response.
        
        Args:
            tool_name: Name of the tool to execute
            params: Parameters for the tool
            session_id: Optional session ID for tracking
            
        Returns:
            MCPResponse with tool execution results
        """
        start_time = time.time()
        
        try:
            # Build the MCP server if needed
            await self._ensure_built()
            
            # Prepare the tool call format
            tool_call = {
                "tool": tool_name,
                "params": params
            }
            
            # Execute via subprocess with stdin/stdout communication
            result = await self._execute_mcp_command(tool_call)
            
            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Estimate tokens (simple approximation)
            tokens_used = self._estimate_tokens(result)
            
            return MCPResponse(
                success=True,
                data=result,
                session_id=session_id,
                tokens_used=tokens_used,
                execution_time_ms=execution_time_ms,
                tool=tool_name
            )
            
        except Exception as e:
            logger.error(f"MCP tool call failed: {tool_name}", exc_info=True)
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            return MCPResponse(
                success=False,
                error=str(e),
                session_id=session_id,
                execution_time_ms=execution_time_ms,
                tool=tool_name
            )
    
    async def _execute_mcp_command(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MCP command via subprocess with proper JSON communication."""
        
        # Create a temporary stdin input for the MCP server
        input_data = json.dumps({
            "method": "tools/call",
            "params": tool_call
        })
        
        # Use node to run the built index.js
        cmd = ["node", str(self.index_js)]
        
        # Run the subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.mcp_path),
            env={**os.environ, "NODE_ENV": "production"}
        )
        
        # Send input and get output
        stdout, stderr = await process.communicate(input_data.encode())
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise MCPError(f"MCP execution failed: {error_msg}", tool=tool_call["tool"])
        
        # Parse the output
        try:
            # MCP server outputs JSON Lines format - get the last line with the result
            output_lines = stdout.decode().strip().split('\n')
            for line in reversed(output_lines):
                if line.strip():
                    try:
                        result = json.loads(line)
                        if "result" in result:
                            return result["result"]
                        elif "content" in result:
                            return result["content"]
                        elif isinstance(result, dict) and len(result) > 0:
                            return result
                    except json.JSONDecodeError:
                        continue
                        
            # If no valid JSON found, return raw output
            return {"raw_output": stdout.decode()}
            
        except Exception as e:
            raise MCPError(f"Failed to parse MCP output: {e}", tool=tool_call["tool"])
    
    async def _ensure_built(self):
        """Ensure MCP server is built."""
        if not self.index_js.exists():
            logger.info("Building MCP server...")
            
            # Run npm build
            process = await asyncio.create_subprocess_exec(
                "npm", "run", "build",
                cwd=str(self.mcp_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Build failed"
                raise MCPError(f"Failed to build MCP server: {error_msg}")
                
            logger.info("MCP server built successfully")
    
    async def get_health(self) -> MCPHealthStatus:
        """Check MCP server health status."""
        try:
            # Check if build exists
            build_exists = self.index_js.exists()
            
            # Try a simple tool call to verify it works
            if build_exists:
                result = await self.call_tool("get_system_health", {})
                process_running = result.success
            else:
                process_running = False
                
            # Get tool count from cache or fresh
            tools = await self.list_tools()
            
            return MCPHealthStatus(
                healthy=build_exists and process_running,
                version="1.10.1",  # From package.json
                tools_count=len(tools),
                process_running=process_running
            )
            
        except Exception as e:
            logger.error("Health check failed", exc_info=True)
            return MCPHealthStatus(
                healthy=False,
                version="unknown",
                tools_count=0,
                process_running=False
            )
    
    async def list_tools(self) -> List[MCPToolInfo]:
        """Get list of available MCP tools."""
        # Check cache first
        if self._tools_cache and self._cache_time:
            cache_age = (datetime.utcnow() - self._cache_time).total_seconds()
            if cache_age < self._cache_ttl:
                return self._tools_cache
        
        # For now, return a hardcoded list of main tools
        # In production, this would query the MCP server
        tools = [
            # Market Data
            MCPToolInfo(
                name="get_ticker",
                description="Get current price and 24h statistics",
                parameters={"symbol": "string", "category": "string"},
                category="market_data"
            ),
            MCPToolInfo(
                name="get_orderbook", 
                description="Get order book depth",
                parameters={"symbol": "string", "limit": "number"},
                category="market_data"
            ),
            MCPToolInfo(
                name="get_market_data",
                description="Get comprehensive market data",
                parameters={"symbol": "string"},
                category="market_data"
            ),
            
            # Technical Analysis
            MCPToolInfo(
                name="perform_technical_analysis",
                description="Comprehensive technical analysis",
                parameters={"symbol": "string", "timeframe": "string", "periods": "number"},
                category="technical"
            ),
            MCPToolInfo(
                name="calculate_fibonacci_levels",
                description="Calculate Fibonacci retracement and extension",
                parameters={"symbol": "string", "timeframe": "string"},
                category="technical"
            ),
            MCPToolInfo(
                name="analyze_bollinger_bands",
                description="Bollinger Bands analysis with squeeze detection",
                parameters={"symbol": "string", "timeframe": "string", "period": "number"},
                category="technical"
            ),
            
            # Wyckoff Analysis
            MCPToolInfo(
                name="analyze_wyckoff_phase",
                description="Detect current Wyckoff phase",
                parameters={"symbol": "string", "timeframe": "string", "lookback": "number"},
                category="wyckoff"
            ),
            MCPToolInfo(
                name="find_wyckoff_events",
                description="Find springs, upthrusts, and tests",
                parameters={"symbol": "string", "timeframe": "string"},
                category="wyckoff"
            ),
            MCPToolInfo(
                name="analyze_composite_man",
                description="Detect institutional manipulation patterns",
                parameters={"symbol": "string", "timeframe": "string"},
                category="wyckoff"
            ),
            
            # Smart Money Concepts
            MCPToolInfo(
                name="detect_order_blocks",
                description="Identify institutional order blocks",
                parameters={"symbol": "string", "timeframe": "string"},
                category="smc"
            ),
            MCPToolInfo(
                name="find_fair_value_gaps",
                description="Detect FVG imbalances",
                parameters={"symbol": "string", "timeframe": "string"},
                category="smc"
            ),
            MCPToolInfo(
                name="analyze_smart_money_confluence",
                description="Complete SMC analysis with confluences",
                parameters={"symbol": "string", "timeframe": "string"},
                category="smc"
            ),
            
            # Volume Analysis
            MCPToolInfo(
                name="analyze_volume",
                description="Volume patterns with VWAP",
                parameters={"symbol": "string", "interval": "string", "periods": "number"},
                category="volume"
            ),
            MCPToolInfo(
                name="analyze_volume_delta",
                description="Calculate volume delta",
                parameters={"symbol": "string", "interval": "string"},
                category="volume"
            ),
            
            # Complete Analysis
            MCPToolInfo(
                name="get_complete_analysis",
                description="Complete market analysis with recommendations",
                parameters={"symbol": "string", "investment": "number"},
                category="complete"
            ),
            MCPToolInfo(
                name="complete_analysis_with_context",
                description="Analysis with 3-month historical context",
                parameters={"symbol": "string", "timeframe": "string"},
                category="complete"
            ),
        ]
        
        # Update cache
        self._tools_cache = tools
        self._cache_time = datetime.utcnow()
        
        return tools
    
    def _estimate_tokens(self, data: Any) -> int:
        """Estimate token usage from response data."""
        # Simple estimation: 1 token ≈ 4 characters
        json_str = json.dumps(data) if isinstance(data, dict) else str(data)
        return len(json_str) // 4
