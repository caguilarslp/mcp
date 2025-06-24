"""MCP Server data models."""

from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from datetime import datetime


class MCPToolCall(BaseModel):
    """Request model for MCP tool calls."""
    
    tool: str = Field(..., description="Tool name to execute")
    params: Dict[str, Any] = Field(default_factory=dict, description="Tool parameters")
    session_id: Optional[str] = Field(None, description="Session ID for tracking")


class MCPResponse(BaseModel):
    """Response model for MCP tool calls."""
    
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    session_id: Optional[str] = None
    tokens_used: int = 0
    execution_time_ms: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tool: str
    

class MCPError(Exception):
    """MCP specific errors."""
    
    def __init__(self, message: str, tool: str = None, params: Dict = None):
        self.message = message
        self.tool = tool
        self.params = params
        super().__init__(self.message)


class MCPToolInfo(BaseModel):
    """Information about an MCP tool."""
    
    name: str
    description: str
    parameters: Dict[str, Any]
    category: str
    

class MCPHealthStatus(BaseModel):
    """MCP Server health status."""
    
    healthy: bool
    version: str
    tools_count: int
    process_running: bool
    last_check: datetime = Field(default_factory=datetime.utcnow)
