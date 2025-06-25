"""
Dependencies for API endpoints
Common dependencies used across routers
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Header
from src.api.models.auth import APIKeyVerifyResponse, APIKeyInfo
from src.api.models.session import SessionResponse
from src.api.services.session_service import SessionService
from src.api.routers.auth import verify_api_key, get_mongo_manager

logger = logging.getLogger(__name__)


async def require_active_session(
    verification: APIKeyVerifyResponse = Depends(verify_api_key)
) -> SessionResponse:
    """
    Require an active session for indicator endpoints.
    This ensures users have paid for access ($1/session).
    """
    # Master key doesn't need sessions
    if verification.key_id == "master":
        # Return a mock session for master key
        from datetime import datetime, timezone, timedelta
        return SessionResponse(
            id="master-session",
            api_key_id="master",
            name="Master Session",
            status="active",
            tokens_used=0,
            max_tokens=1000000,
            requests_count=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            last_activity=None
        )
    
    # Check for active session
    mongo = get_mongo_manager()
    session_service = SessionService(mongo_manager=mongo)
    
    active_session = await session_service.get_active_session(verification.key_id)
    
    if not active_session:
        raise HTTPException(
            status_code=402,  # Payment Required
            detail="Active session required. Please purchase a session to use indicators.",
            headers={
                "X-Session-Required": "true",
                "X-Session-Price": "$1",
                "X-Session-Endpoint": "/api/v1/sessions"
            }
        )
    
    return active_session


async def optional_session(
    verification: APIKeyVerifyResponse = Depends(verify_api_key)
) -> Optional[SessionResponse]:
    """
    Optional session check - returns session if exists, None otherwise.
    Used for endpoints that work with or without sessions.
    """
    if verification.key_id == "master":
        return None
    
    try:
        mongo = get_mongo_manager()
        session_service = SessionService(mongo_manager=mongo)
        return await session_service.get_active_session(verification.key_id)
    except Exception as e:
        logger.debug(f"Could not get session: {e}")
        return None


async def get_api_key(
    x_api_key: str = Header(..., description="API Key for authentication")
) -> APIKeyInfo:
    """
    Get API key from header and verify it.
    Returns the API key object if valid.
    """
    # Use the existing verify_api_key function
    verification = await verify_api_key(x_api_key)
    
    # For master key, return a mock APIKeyInfo object
    if verification.key_id == "master":
        from datetime import datetime, timezone
        return APIKeyInfo(
            id="master",
            name="Master Key",
            permissions=["admin"],
            created_at=datetime.now(timezone.utc),
            last_used=datetime.now(timezone.utc),
            expires_at=None,
            active=True,
            rate_limit_per_minute=1000,
            rate_limit_per_hour=60000,
            usage_count=0
        )
    
    # Get the actual API key from database
    mongo = get_mongo_manager()
    key_doc = await mongo.api_keys.find_one({"_id": verification.key_id})
    
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Convert to APIKeyInfo model
    return APIKeyInfo(
        id=str(key_doc["_id"]),
        name=key_doc["name"],
        permissions=key_doc.get("permissions", ["read"]),
        created_at=key_doc["created_at"],
        last_used=key_doc.get("last_used_at"),
        expires_at=key_doc.get("expires_at"),
        active=key_doc.get("is_active", True),
        rate_limit_per_minute=key_doc.get("rate_limit_per_minute", 60),
        rate_limit_per_hour=key_doc.get("rate_limit_per_hour", 3600),
        usage_count=key_doc.get("usage_count", 0)
    )
