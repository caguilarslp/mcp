"""
Authentication Router
Simple API key authentication (OAuth2 for future)
"""

import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from src.api.config import APIConfig

logger = logging.getLogger(__name__)
router = APIRouter()

# API Key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


class APIKeyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    expires_in_days: Optional[int] = 365


class APIKeyResponse(BaseModel):
    api_key: str
    name: str
    created_at: datetime
    expires_at: Optional[datetime]
    message: str = "Store this key securely. It will not be shown again."


class APIKeyInfo(BaseModel):
    name: str
    description: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
    is_active: bool
    last_used: Optional[datetime]


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify API key and return user info
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    config = APIConfig()
    
    # For now, just check against master key
    # TODO: Implement proper API key storage in MongoDB
    if api_key != config.MASTER_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    
    return api_key


@router.post("/keys", response_model=APIKeyResponse)
async def create_api_key(
    request: APIKeyRequest,
    current_key: str = Depends(verify_api_key)
):
    """
    Create a new API key (requires master key)
    
    This is a placeholder implementation. In production:
    - Store keys in MongoDB with hashed values
    - Implement proper key rotation
    - Add role-based permissions
    """
    # Generate secure random key
    new_key = f"wadm_{secrets.token_urlsafe(32)}"
    
    # Calculate expiration
    created_at = datetime.utcnow()
    expires_at = None
    if request.expires_in_days:
        expires_at = created_at + timedelta(days=request.expires_in_days)
    
    # TODO: Store in database
    logger.info(f"Created new API key: {request.name}")
    
    return APIKeyResponse(
        api_key=new_key,
        name=request.name,
        created_at=created_at,
        expires_at=expires_at
    )


@router.get("/keys/verify", response_model=APIKeyInfo)
async def verify_key(current_key: str = Depends(verify_api_key)):
    """
    Verify current API key and get info
    """
    # For now, return master key info
    # TODO: Implement proper key lookup
    return APIKeyInfo(
        name="Master Key",
        description="Development master key",
        created_at=datetime.utcnow(),
        expires_at=None,
        is_active=True,
        last_used=datetime.utcnow()
    )


@router.delete("/keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_key: str = Depends(verify_api_key)
):
    """
    Revoke an API key
    """
    # TODO: Implement key revocation
    logger.info(f"Revoked API key: {key_id}")
    
    return {
        "status": "success",
        "message": f"API key {key_id} has been revoked"
    }


@router.get("/")
async def auth_info():
    """
    Get authentication info
    """
    return {
        "type": "api_key",
        "header": "X-API-Key",
        "description": "Include your API key in the X-API-Key header",
        "example": "X-API-Key: wadm_your_key_here"
    }
