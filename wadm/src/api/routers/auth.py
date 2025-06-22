"""
Authentication Router
Complete API key management with database persistence
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Security, Query
from fastapi.security import APIKeyHeader

from src.api.config import APIConfig
from src.api.models.auth import (
    APIKeyCreate, APIKeyResponse, APIKeyInfo, 
    APIKeyList, APIKeyVerifyResponse, PermissionLevel
)
from src.api.services.auth_service import AuthService
from src.storage.mongo_manager import MongoManager

logger = logging.getLogger(__name__)
router = APIRouter()

# API Key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Global instances
_mongo_manager: Optional[MongoManager] = None
_auth_service: Optional[AuthService] = None


def get_mongo_manager() -> Optional[MongoManager]:
    """Get MongoDB manager instance."""
    global _mongo_manager
    if _mongo_manager is None:
        try:
            _mongo_manager = MongoManager()
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
    return _mongo_manager


def get_auth_service() -> AuthService:
    """Get auth service instance."""
    global _auth_service
    if _auth_service is None:
        mongo = get_mongo_manager()
        _auth_service = AuthService(mongo_manager=mongo)
    return _auth_service


async def verify_api_key(
    api_key: str = Security(api_key_header),
    auth_service: AuthService = Depends(get_auth_service)
) -> APIKeyVerifyResponse:
    """
    Verify API key and return verification details
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    config = APIConfig()
    
    # Check if it's the master key
    if api_key == config.MASTER_API_KEY:
        return APIKeyVerifyResponse(
            valid=True,
            key_id="master",
            permissions=[PermissionLevel.ADMIN],
            expires_at=None
        )
    
    # Verify against database
    verification = await auth_service.verify_api_key(api_key)
    
    if not verification.valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired API key"
        )
    
    return verification


async def require_admin(
    verification: APIKeyVerifyResponse = Depends(verify_api_key)
) -> APIKeyVerifyResponse:
    """Require admin permissions."""
    if PermissionLevel.ADMIN not in (verification.permissions or []):
        raise HTTPException(
            status_code=403,
            detail="Admin permissions required"
        )
    return verification


@router.post("/keys", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    verification: APIKeyVerifyResponse = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Create a new API key (requires admin permissions)
    
    The API key will only be shown once in the response.
    Store it securely as it cannot be retrieved later.
    """
    try:
        return await auth_service.create_api_key(key_data)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(status_code=500, detail="Failed to create API key")


@router.get("/keys", response_model=APIKeyList)
async def list_api_keys(
    skip: int = Query(0, ge=0, description="Number of keys to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum keys to return"),
    verification: APIKeyVerifyResponse = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    List all API keys (requires admin permissions)
    
    Returns key information without the actual keys.
    """
    return await auth_service.list_api_keys(skip=skip, limit=limit)


@router.get("/keys/verify", response_model=APIKeyVerifyResponse)
async def verify_current_key(
    verification: APIKeyVerifyResponse = Depends(verify_api_key)
):
    """
    Verify the current API key and get its details
    """
    return verification


@router.get("/keys/{key_id}", response_model=APIKeyInfo)
async def get_api_key(
    key_id: str,
    verification: APIKeyVerifyResponse = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Get details for a specific API key (requires admin permissions)
    """
    key_info = await auth_service.get_api_key(key_id)
    
    if not key_info:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return key_info


@router.delete("/keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    verification: APIKeyVerifyResponse = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Revoke an API key (requires admin permissions)
    """
    # Prevent revoking master key
    if key_id == "master":
        raise HTTPException(status_code=400, detail="Cannot revoke master key")
    
    success = await auth_service.revoke_api_key(key_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {
        "status": "success",
        "message": f"API key {key_id} has been revoked"
    }


@router.post("/keys/cleanup")
async def cleanup_expired_keys(
    verification: APIKeyVerifyResponse = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Clean up expired API keys (requires admin permissions)
    """
    count = await auth_service.cleanup_expired_keys()
    
    return {
        "status": "success",
        "cleaned": count,
        "message": f"Cleaned up {count} expired API keys"
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
        "example": "X-API-Key: wadm_your_key_here",
        "endpoints": {
            "create": "POST /api/v1/auth/keys",
            "list": "GET /api/v1/auth/keys",
            "verify": "GET /api/v1/auth/keys/verify",
            "details": "GET /api/v1/auth/keys/{key_id}",
            "revoke": "DELETE /api/v1/auth/keys/{key_id}"
        }
    }
