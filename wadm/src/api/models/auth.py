"""
Authentication models for API key management.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class PermissionLevel(str, Enum):
    """API key permission levels."""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class APIKeyCreate(BaseModel):
    """Request model for creating a new API key."""
    name: str = Field(..., min_length=3, max_length=50, description="Descriptive name for the API key")
    permissions: List[PermissionLevel] = Field(default=[PermissionLevel.READ], description="Permission levels")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date")


class APIKeyResponse(BaseModel):
    """Response model for API key creation."""
    id: str = Field(..., description="Unique API key ID")
    key: str = Field(..., description="The actual API key (only shown once)")
    name: str = Field(..., description="Key name")
    permissions: List[PermissionLevel] = Field(..., description="Granted permissions")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration date if set")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class APIKeyInfo(BaseModel):
    """Model for API key information (without the actual key)."""
    id: str = Field(..., description="Unique API key ID")
    name: str = Field(..., description="Key name")
    permissions: List[PermissionLevel] = Field(..., description="Granted permissions")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_used: Optional[datetime] = Field(None, description="Last usage timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration date if set")
    active: bool = Field(True, description="Whether the key is active")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class APIKeyList(BaseModel):
    """Response model for listing API keys."""
    keys: List[APIKeyInfo] = Field(..., description="List of API keys")
    total: int = Field(..., description="Total number of keys")


class APIKeyVerifyResponse(BaseModel):
    """Response model for API key verification."""
    valid: bool = Field(..., description="Whether the key is valid")
    key_id: Optional[str] = Field(None, description="Key ID if valid")
    permissions: Optional[List[PermissionLevel]] = Field(None, description="Permissions if valid")
    expires_at: Optional[datetime] = Field(None, description="Expiration date if set")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
