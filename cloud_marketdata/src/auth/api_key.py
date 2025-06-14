"""
API Key Authentication System

Simple API key authentication for temporary development access.
In production, this should be replaced with proper OAuth2/JWT.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Set
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from src.core.logger import get_logger

logger = get_logger("auth")

# In-memory storage for API keys (replace with Redis in production)
# Structure: {api_key_hash: ApiKeyInfo}
api_keys_store: Dict[str, "ApiKeyInfo"] = {}

# Active sessions for rate limiting
active_sessions: Dict[str, Set[str]] = {}  # api_key -> set of IPs

class ApiKeyInfo(BaseModel):
    """API Key information"""
    key_hash: str
    name: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    allowed_ips: Optional[Set[str]] = None
    max_concurrent_ips: int = 5
    permissions: Set[str] = {"read"}  # read, write, admin
    is_active: bool = True
    last_used: Optional[datetime] = None
    usage_count: int = 0

# FastAPI security scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def create_api_key(
    name: str,
    expires_in_days: Optional[int] = 7,
    allowed_ips: Optional[Set[str]] = None,
    permissions: Optional[Set[str]] = None
) -> str:
    """
    Create a new API key
    
    Args:
        name: Friendly name for the key
        expires_in_days: Days until expiration (None for no expiration)
        allowed_ips: Set of allowed IP addresses (None for any)
        permissions: Set of permissions (default: read-only)
        
    Returns:
        The API key (show this to user only once!)
    """
    # Generate a secure random key
    api_key = f"cmkd_{secrets.token_urlsafe(32)}"
    
    # Hash the key for storage
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Calculate expiration
    expires_at = None
    if expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    
    # Store key info
    key_info = ApiKeyInfo(
        key_hash=key_hash,
        name=name,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        allowed_ips=allowed_ips,
        permissions=permissions or {"read"}
    )
    
    api_keys_store[key_hash] = key_info
    
    logger.info(f"Created API key '{name}' with hash {key_hash[:8]}...")
    
    return api_key

def verify_api_key(
    api_key: str,
    client_ip: Optional[str] = None,
    required_permission: str = "read"
) -> ApiKeyInfo:
    """
    Verify an API key
    
    Args:
        api_key: The API key to verify
        client_ip: Client IP address for validation
        required_permission: Required permission
        
    Returns:
        ApiKeyInfo if valid
        
    Raises:
        HTTPException if invalid
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    # Hash the provided key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Check if key exists
    key_info = api_keys_store.get(key_hash)
    if not key_info:
        logger.warning(f"Invalid API key attempt with hash {key_hash[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Check if active
    if not key_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is disabled"
        )
    
    # Check expiration
    if key_info.expires_at and datetime.utcnow() > key_info.expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key has expired"
        )
    
    # Check IP whitelist
    if key_info.allowed_ips and client_ip and client_ip not in key_info.allowed_ips:
        logger.warning(f"API key {key_info.name} used from unauthorized IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access from this IP not allowed"
        )
    
    # Check permissions
    if required_permission not in key_info.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{required_permission}' required"
        )
    
    # Track concurrent IPs
    if client_ip:
        if key_hash not in active_sessions:
            active_sessions[key_hash] = set()
        
        active_sessions[key_hash].add(client_ip)
        
        if len(active_sessions[key_hash]) > key_info.max_concurrent_ips:
            logger.warning(
                f"API key {key_info.name} exceeded max concurrent IPs: "
                f"{len(active_sessions[key_hash])}"
            )
            # Don't block, just warn for now
    
    # Update usage stats
    key_info.last_used = datetime.utcnow()
    key_info.usage_count += 1
    
    logger.debug(f"API key {key_info.name} verified successfully")
    
    return key_info

class APIKeyAuth:
    """FastAPI dependency for API key authentication"""
    
    def __init__(self, required_permission: str = "read"):
        self.required_permission = required_permission
    
    def __call__(
        self, 
        api_key: Optional[str] = Security(api_key_header),
        # In production, get client IP from request
    ) -> ApiKeyInfo:
        """Verify API key as FastAPI dependency"""
        return verify_api_key(
            api_key=api_key,
            client_ip=None,  # TODO: Extract from request
            required_permission=self.required_permission
        )

# Convenience instances
require_read = APIKeyAuth("read")
require_write = APIKeyAuth("write")
require_admin = APIKeyAuth("admin")

# Management functions
def list_api_keys() -> Dict[str, Dict]:
    """List all API keys (without the actual keys)"""
    return {
        key_hash[:12]: {
            "name": info.name,
            "created_at": info.created_at.isoformat(),
            "expires_at": info.expires_at.isoformat() if info.expires_at else None,
            "is_active": info.is_active,
            "permissions": list(info.permissions),
            "usage_count": info.usage_count,
            "last_used": info.last_used.isoformat() if info.last_used else None
        }
        for key_hash, info in api_keys_store.items()
    }

def revoke_api_key(key_hash_prefix: str) -> bool:
    """Revoke an API key by hash prefix"""
    for key_hash, info in api_keys_store.items():
        if key_hash.startswith(key_hash_prefix):
            info.is_active = False
            logger.info(f"Revoked API key {info.name}")
            return True
    return False

def cleanup_expired_keys() -> int:
    """Remove expired API keys"""
    now = datetime.utcnow()
    removed = 0
    
    for key_hash in list(api_keys_store.keys()):
        info = api_keys_store[key_hash]
        if info.expires_at and now > info.expires_at:
            del api_keys_store[key_hash]
            if key_hash in active_sessions:
                del active_sessions[key_hash]
            removed += 1
    
    if removed > 0:
        logger.info(f"Cleaned up {removed} expired API keys")
    
    return removed
