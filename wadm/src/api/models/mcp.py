"""MCP request/response models."""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class MCPToolCall(BaseModel):
    """Request model for MCP tool calls."""
    tool: str = Field(..., description="Tool name to call")
    params: Dict[str, Any] = Field(default_factory=dict, description="Tool parameters")
    session_id: Optional[str] = Field(None, description="Session ID for tracking")
    
    class Config:
        schema_extra = {
            "example": {
                "tool": "analyze_wyckoff_phase",
                "params": {
                    "symbol": "BTCUSDT",
                    "timeframe": "60"
                }
            }
        }
