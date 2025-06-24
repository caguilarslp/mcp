"""
Session Router for WAIckoff session-based billing
Manages sessions, usage tracking, and quotas
"""

import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import APIKeyHeader

from src.api.models.session import (
    SessionCreate, SessionResponse, SessionSummary,
    SessionList, SessionStatus, TokenQuota
)
from src.api.models.auth import APIKeyVerifyResponse
from src.api.services.session_service import SessionService
from src.api.routers.auth import verify_api_key, get_mongo_manager

logger = logging.getLogger(__name__)
router = APIRouter()

# Global session service instance
_session_service: Optional[SessionService] = None


def get_session_service() -> SessionService:
    """Get session service instance."""
    global _session_service
    if _session_service is None:
        mongo = get_mongo_manager()
        _session_service = SessionService(mongo_manager=mongo)
    return _session_service


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Create a new session for the authenticated API key.
    
    Sessions are required for using analysis endpoints and are billed at $1 per session.
    Each session includes 100,000 tokens or 24 hours of usage, whichever comes first.
    """
    try:
        return await session_service.create_session(
            api_key_id=verification.key_id,
            session_data=session_data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/sessions/current", response_model=SessionResponse)
async def get_current_session(
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Get the current active session for the authenticated API key.
    """
    session = await session_service.get_active_session(verification.key_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No active session found. Please create a new session."
        )
    
    return session


@router.get("/sessions", response_model=SessionList)
async def list_sessions(
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum sessions to return"),
    status: Optional[SessionStatus] = Query(None, description="Filter by status"),
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    List all sessions for the authenticated API key.
    """
    return await session_service.list_sessions(
        api_key_id=verification.key_id,
        skip=skip,
        limit=limit,
        status=status
    )


@router.get("/sessions/{session_id}", response_model=SessionSummary)
async def get_session_summary(
    session_id: str,
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Get detailed summary of a specific session.
    """
    summary = await session_service.get_session_summary(session_id)
    
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership (check if session belongs to this API key)
    session = await session_service.get_active_session(verification.key_id)
    if session and session.id != session_id:
        # Check in all sessions
        sessions = await session_service.list_sessions(verification.key_id, limit=1000)
        if not any(s.id == session_id for s in sessions.sessions):
            raise HTTPException(status_code=403, detail="Access denied to this session")
    
    return summary


@router.post("/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Manually terminate a session.
    """
    # Verify ownership
    sessions = await session_service.list_sessions(verification.key_id, limit=1000)
    if not any(s.id == session_id for s in sessions.sessions):
        raise HTTPException(status_code=403, detail="Access denied to this session")
    
    success = await session_service.terminate_session(session_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "status": "success",
        "message": f"Session {session_id} has been terminated"
    }


@router.get("/quota", response_model=TokenQuota)
async def get_token_quota(
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Get token quota information for the authenticated API key.
    """
    quota = await session_service.get_token_quota(verification.key_id)
    
    if not quota:
        raise HTTPException(status_code=404, detail="Quota information not found")
    
    return quota


@router.post("/quota/add")
async def add_session_quota(
    sessions: int = Query(..., ge=1, le=1000, description="Number of sessions to add"),
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Add sessions to the API key's quota.
    
    **PLACEHOLDER**: This is a mock endpoint for development.
    In production, this will be called after successful payment processing.
    
    TODO: Integrate with Stripe/PayPal webhook after payment confirmation.
    """
    try:
        quota = await session_service.add_session_quota(verification.key_id, sessions)
        
        return {
            "status": "success",
            "message": f"Added {sessions} sessions to quota",
            "quota": quota
        }
    except Exception as e:
        logger.error(f"Error adding session quota: {e}")
        raise HTTPException(status_code=500, detail="Failed to add session quota")


@router.post("/sessions/cleanup")
async def cleanup_expired_sessions(
    verification: APIKeyVerifyResponse = Depends(verify_api_key),
    session_service: SessionService = Depends(get_session_service)
):
    """
    Clean up expired sessions (admin only).
    """
    from src.api.models.auth import PermissionLevel
    if PermissionLevel.ADMIN not in (verification.permissions or []):
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    count = await session_service.cleanup_expired_sessions()
    
    return {
        "status": "success",
        "cleaned": count,
        "message": f"Cleaned up {count} expired sessions"
    }


@router.get("/")
async def sessions_info():
    """
    Get sessions API information.
    """
    return {
        "description": "WAIckoff session-based billing system",
        "pricing": "$1 per session (100,000 tokens or 24 hours)",
        "endpoints": {
            "create": "POST /api/v1/sessions",
            "current": "GET /api/v1/sessions/current",
            "list": "GET /api/v1/sessions",
            "details": "GET /api/v1/sessions/{session_id}",
            "terminate": "POST /api/v1/sessions/{session_id}/terminate",
            "quota": "GET /api/v1/sessions/quota"
        },
        "packages": {
            "starter": {"sessions": 5, "price": "$5"},
            "basic": {"sessions": 20, "price": "$18"},
            "pro": {"sessions": 50, "price": "$40"},
            "business": {"sessions": 200, "price": "$80"}
        }
    }
