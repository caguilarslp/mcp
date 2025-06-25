"""MCP Server HTTP Wrapper for Docker communication.

This wrapper exposes the MCP Server via HTTP to allow communication
between Docker containers. It acts as a bridge between HTTP requests
and the MCP stdio protocol.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class MCPRequest(BaseModel):
    """Request model for MCP calls."""
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[int] = 1


class MCPServerWrapper:
    """Wrapper to communicate with MCP Server via stdio."""
    
    def __init__(self):
        self.process: Optional[asyncio.subprocess.Process] = None
        self.lock = asyncio.Lock()
        self.request_id = 0
        self._initialized = False
        
    async def start(self):
        """Start the MCP Server process."""
        if self.process is None:
            logger.info("Starting MCP Server process...")
            
            # Check if build directory exists
            build_path = Path("/app/build/index.js")
            if not build_path.exists():
                logger.error(f"MCP Server build not found at {build_path}")
                raise RuntimeError(f"MCP Server not built. Expected file: {build_path}")
            
            # Start MCP Server with suppressed console output
            try:
                # Set environment to suppress MCP logs
                env = os.environ.copy()
                env["NODE_ENV"] = "production"
                env["LOG_LEVEL"] = "error"  # Only show errors
                env["SUPPRESS_STARTUP_LOGS"] = "true"
                
                self.process = await asyncio.create_subprocess_exec(
                    "node",
                    str(build_path),
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd="/app",
                    env=env
                )
                
                # Give it time to initialize and consume startup logs
                await asyncio.sleep(5)
                
                # Consume any startup output
                await self._consume_startup_logs()
                
                # Check if process is still running
                if self.process.returncode is not None:
                    stderr = await self.process.stderr.read()
                    raise RuntimeError(f"MCP Server exited immediately: {stderr.decode()}")
                
                logger.info(f"MCP Server started with PID: {self.process.pid}")
                self._initialized = True
                
            except Exception as e:
                logger.error(f"Failed to start MCP Server: {e}")
                self.process = None
                raise
    
    async def _consume_startup_logs(self):
        """Consume startup logs from MCP Server."""
        try:
            # Read any available startup logs without blocking
            while True:
                try:
                    line = await asyncio.wait_for(
                        self.process.stdout.readline(),
                        timeout=0.1
                    )
                    if not line:
                        break
                    decoded = line.decode().strip()
                    # Only log if it's not JSON
                    if decoded and not decoded.startswith('{'):
                        logger.debug(f"MCP startup log: {decoded}")
                except asyncio.TimeoutError:
                    break
        except Exception as e:
            logger.debug(f"Error consuming startup logs: {e}")
    
    async def _read_json_response(self) -> Dict[str, Any]:
        """Read and parse JSON response from MCP, filtering out non-JSON lines."""
        max_attempts = 50  # Maximum lines to read looking for JSON
        
        for _ in range(max_attempts):
            try:
                line = await asyncio.wait_for(
                    self.process.stdout.readline(),
                    timeout=10.0
                )
                
                if not line:
                    raise RuntimeError("MCP Server closed unexpectedly")
                
                decoded = line.decode().strip()
                
                # Skip empty lines and obvious log lines
                if not decoded or decoded.startswith('[') or decoded.startswith('✅') or decoded.startswith('🆕'):
                    continue
                
                # Try to parse as JSON
                if decoded.startswith('{'):
                    try:
                        response = json.loads(decoded)
                        # Verify it's a valid JSON-RPC response
                        if "jsonrpc" in response or "result" in response or "error" in response:
                            return response
                    except json.JSONDecodeError:
                        logger.debug(f"Invalid JSON line: {decoded[:100]}")
                        continue
                
            except asyncio.TimeoutError:
                raise RuntimeError("Timeout waiting for JSON response from MCP Server")
        
        raise RuntimeError("Could not find valid JSON response in MCP output")
    
    async def send_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send request to MCP Server and get response."""
        async with self.lock:
            if self.process is None:
                await self.start()
            
            # Wait a bit if just initialized
            if self._initialized:
                await asyncio.sleep(1)
                self._initialized = False
            
            self.request_id += 1
            request = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params or {},
                "id": self.request_id
            }
            
            # Send request
            request_str = json.dumps(request) + "\n"
            logger.debug(f"Sending to MCP: {request_str.strip()}")
            
            try:
                self.process.stdin.write(request_str.encode())
                await self.process.stdin.drain()
            except Exception as e:
                logger.error(f"Failed to send request: {e}")
                self.process = None
                raise RuntimeError("Lost connection to MCP Server")
            
            # Read response, filtering out log lines
            try:
                response = await self._read_json_response()
                logger.debug(f"MCP response: {json.dumps(response)[:200]}...")
                
                if "error" in response:
                    raise RuntimeError(f"MCP Error: {response['error']}")
                
                return response.get("result", {})
                
            except Exception as e:
                logger.error(f"Error reading MCP response: {e}")
                # Try to read any error output
                try:
                    stderr = await asyncio.wait_for(self.process.stderr.read(1000), timeout=1.0)
                    if stderr:
                        logger.error(f"MCP stderr: {stderr.decode()}")
                except:
                    pass
                raise
    
    async def shutdown(self):
        """Shutdown MCP Server process."""
        if self.process:
            logger.info("Stopping MCP Server...")
            try:
                self.process.terminate()
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("MCP Server didn't stop gracefully, killing...")
                self.process.kill()
                await self.process.wait()
            self.process = None
            logger.info("MCP Server stopped")


# Global MCP wrapper instance
mcp_wrapper = MCPServerWrapper()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting MCP HTTP Wrapper...")
    try:
        await mcp_wrapper.start()
        logger.info("MCP HTTP Wrapper started successfully")
    except Exception as e:
        logger.error(f"Failed to start MCP Server: {e}")
        # Don't fail startup, allow health endpoint to report unhealthy
    
    yield
    
    # Shutdown
    logger.info("Shutting down MCP HTTP Wrapper...")
    await mcp_wrapper.shutdown()
    logger.info("MCP HTTP Wrapper shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="MCP Server HTTP Wrapper",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check if process is running
        if mcp_wrapper.process is None or mcp_wrapper.process.returncode is not None:
            # Try to start it
            try:
                await mcp_wrapper.start()
            except Exception as e:
                return JSONResponse(
                    status_code=503,
                    content={
                        "status": "unhealthy",
                        "error": str(e),
                        "mcp_running": False
                    }
                )
        
        # Try to list tools as a health check
        result = await mcp_wrapper.send_request("tools/list")
        tools = result.get("tools", [])
        
        return {
            "status": "healthy",
            "mcp_running": True,
            "tools_count": len(tools),
            "version": "1.10.1"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "mcp_running": mcp_wrapper.process is not None
            }
        )


@app.post("/mcp/call")
async def call_mcp(request: MCPRequest):
    """Call MCP Server method."""
    try:
        result = await mcp_wrapper.send_request(request.method, request.params)
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"MCP call failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mcp/tools")
async def list_tools():
    """List available MCP tools."""
    try:
        result = await mcp_wrapper.send_request("tools/list")
        return {"tools": result.get("tools", [])}
    except Exception as e:
        logger.error(f"Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mcp/tools/{tool_name}")
async def get_tool_info(tool_name: str):
    """Get information about a specific tool."""
    try:
        result = await mcp_wrapper.send_request("tools/list")
        tools = result.get("tools", [])
        
        # Find the specific tool
        for tool in tools:
            if tool.get("name") == tool_name:
                return {"tool": tool}
        
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tool info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run the HTTP wrapper
    uvicorn.run(app, host="0.0.0.0", port=3000)
