"""
Session models for WAIckoff session-based billing.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum


class SessionStatus(str, Enum):
    """Session status types."""
    ACTIVE = "active"
    EXPIRED = "expired"
    EXHAUSTED = "exhausted"  # Token limit reached
    TERMINATED = "terminated"  # Manually ended


class SessionCreate(BaseModel):
    """Request model for creating a new session."""
    api_key_id: str = Field(..., description="API key ID")
    name: Optional[str] = Field(None, description="Optional session name")
    max_tokens: int = Field(100000, description="Maximum tokens for session")
    duration_hours: int = Field(24, description="Session duration in hours")


class SessionResponse(BaseModel):
    """Response model for session creation."""
    id: str = Field(..., description="Unique session ID")
    api_key_id: str = Field(..., description="Associated API key ID")
    name: Optional[str] = Field(None, description="Session name")
    status: SessionStatus = Field(..., description="Current status")
    tokens_used: int = Field(0, description="Tokens consumed")
    max_tokens: int = Field(..., description="Token limit")
    requests_count: int = Field(0, description="Number of requests")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    last_activity: Optional[datetime] = Field(None, description="Last activity timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionUsage(BaseModel):
    """Model for tracking session usage."""
    session_id: str = Field(..., description="Session ID")
    endpoint: str = Field(..., description="API endpoint called")
    tokens_used: int = Field(..., description="Tokens consumed in this request")
    request_data: Dict[str, Any] = Field({}, description="Request parameters")
    response_size: int = Field(..., description="Response size in bytes")
    duration_ms: int = Field(..., description="Request duration in milliseconds")
    timestamp: datetime = Field(..., description="Request timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionSummary(BaseModel):
    """Summary of session usage."""
    session_id: str = Field(..., description="Session ID")
    status: SessionStatus = Field(..., description="Current status")
    tokens_used: int = Field(..., description="Total tokens consumed")
    tokens_remaining: int = Field(..., description="Tokens remaining")
    requests_count: int = Field(..., description="Total requests")
    duration_hours: float = Field(..., description="Session duration in hours")
    endpoints_used: Dict[str, int] = Field({}, description="Endpoint usage count")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionList(BaseModel):
    """Response model for listing sessions."""
    sessions: List[SessionResponse] = Field(..., description="List of sessions")
    total: int = Field(..., description="Total number of sessions")
    active_count: int = Field(..., description="Number of active sessions")
    
    
class TokenQuota(BaseModel):
    """Model for API key token quotas."""
    api_key_id: str = Field(..., description="API key ID")
    total_sessions: int = Field(0, description="Total sessions purchased")
    used_sessions: int = Field(0, description="Sessions used")
    remaining_sessions: int = Field(0, description="Sessions remaining")
    total_tokens_purchased: int = Field(0, description="Total tokens purchased")
    total_tokens_used: int = Field(0, description="Total tokens consumed")
    last_purchase: Optional[datetime] = Field(None, description="Last purchase timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
