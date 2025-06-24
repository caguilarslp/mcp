"""
Session management service for WAIckoff session-based billing.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
import hashlib

from src.api.models.session import (
    SessionCreate, SessionResponse, SessionUsage,
    SessionSummary, SessionList, SessionStatus,
    TokenQuota
)
from src.storage.mongo_manager import MongoManager

logger = logging.getLogger(__name__)


class SessionService:
    """Service for managing user sessions and usage tracking."""
    
    def __init__(self, mongo_manager: Optional[MongoManager] = None):
        """Initialize session service with MongoDB connection."""
        self.mongo = mongo_manager
        self.sessions_collection = "sessions"
        self.usage_collection = "session_usage"
        self.quotas_collection = "token_quotas"
        
    async def _ensure_indexes(self):
        """Ensure necessary indexes exist for sessions collections."""
        if not self.mongo:
            return
            
        try:
            # Sessions collection indexes
            sessions = self.mongo.db[self.sessions_collection]
            sessions.create_index("api_key_id")
            sessions.create_index([("status", 1), ("expires_at", 1)])
            sessions.create_index([("created_at", -1)])
            
            # Usage collection indexes
            usage = self.mongo.db[self.usage_collection]
            usage.create_index("session_id")
            usage.create_index([("timestamp", -1)])
            usage.create_index([("session_id", 1), ("timestamp", -1)])
            
            # Quotas collection indexes
            quotas = self.mongo.db[self.quotas_collection]
            quotas.create_index("api_key_id", unique=True)
            
        except Exception as e:
            logger.error(f"Error creating session indexes: {e}")
    
    async def create_session(self, api_key_id: str, session_data: SessionCreate) -> SessionResponse:
        """Create a new session for an API key."""
        if not self.mongo:
            raise ValueError("MongoDB connection not available")
        
        await self._ensure_indexes()
        
        # Check quota first
        quota = await self.get_token_quota(api_key_id)
        if quota and quota.remaining_sessions <= 0:
            raise ValueError("No sessions remaining in quota")
        
        # Create session document
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=session_data.duration_hours)
        
        doc = {
            "api_key_id": api_key_id,
            "name": session_data.name,
            "status": SessionStatus.ACTIVE.value,
            "tokens_used": 0,
            "max_tokens": session_data.max_tokens,
            "requests_count": 0,
            "created_at": now,
            "expires_at": expires_at,
            "last_activity": None
        }
        
        # Insert session
        result = self.mongo.db[self.sessions_collection].insert_one(doc)
        
        # Update quota
        await self._decrement_session_quota(api_key_id)
        
        # Return response
        return SessionResponse(
            id=str(result.inserted_id),
            api_key_id=api_key_id,
            name=session_data.name,
            status=SessionStatus.ACTIVE,
            tokens_used=0,
            max_tokens=session_data.max_tokens,
            requests_count=0,
            created_at=now,
            expires_at=expires_at,
            last_activity=None
        )
    
    async def track_endpoint_usage(self, session_id: str, endpoint: str, tokens_used: int) -> bool:
        """Track endpoint usage for a session (simplified version of track_usage)."""
        if not self.mongo:
            return False
            
        usage = SessionUsage(
            session_id=session_id,
            endpoint=endpoint,
            tokens_used=tokens_used,
            request_data={},
            response_size=0,
            duration_ms=0,
            timestamp=datetime.now(timezone.utc)
        )
        
        return await self.track_usage(session_id, usage)
    
    async def get_active_session(self, api_key_id: str) -> Optional[SessionResponse]:
        """Get the current active session for an API key."""
        if not self.mongo:
            return None
        
        now = datetime.now(timezone.utc)
        
        # Find active session
        doc = self.mongo.db[self.sessions_collection].find_one({
            "api_key_id": api_key_id,
            "status": SessionStatus.ACTIVE.value,
            "expires_at": {"$gt": now}
        }, sort=[("created_at", -1)])
        
        if not doc:
            return None
        
        # Check if tokens exhausted
        if doc["tokens_used"] >= doc["max_tokens"]:
            # Update status to exhausted
            self.mongo.db[self.sessions_collection].update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": SessionStatus.EXHAUSTED.value}}
            )
            return None
        
        return self._doc_to_session_response(doc)
    
    async def track_usage(self, session_id: str, usage: SessionUsage) -> bool:
        """Track API usage for a session."""
        if not self.mongo:
            return False
        
        try:
            # Insert usage record
            usage_doc = {
                "session_id": session_id,
                "endpoint": usage.endpoint,
                "tokens_used": usage.tokens_used,
                "request_data": usage.request_data,
                "response_size": usage.response_size,
                "duration_ms": usage.duration_ms,
                "timestamp": usage.timestamp
            }
            self.mongo.db[self.usage_collection].insert_one(usage_doc)
            
            # Update session stats
            session_update = {
                "$inc": {
                    "tokens_used": usage.tokens_used,
                    "requests_count": 1
                },
                "$set": {
                    "last_activity": usage.timestamp
                }
            }
            
            result = self.mongo.db[self.sessions_collection].update_one(
                {"_id": ObjectId(session_id)},
                session_update
            )
            
            # Check if session should be marked as exhausted
            if result.modified_count > 0:
                session = self.mongo.db[self.sessions_collection].find_one(
                    {"_id": ObjectId(session_id)}
                )
                if session and session["tokens_used"] >= session["max_tokens"]:
                    self.mongo.db[self.sessions_collection].update_one(
                        {"_id": ObjectId(session_id)},
                        {"$set": {"status": SessionStatus.EXHAUSTED.value}}
                    )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error tracking usage: {e}")
            return False
    
    async def get_session_summary(self, session_id: str) -> Optional[SessionSummary]:
        """Get detailed summary of a session."""
        if not self.mongo:
            return None
        
        try:
            # Get session
            session = self.mongo.db[self.sessions_collection].find_one(
                {"_id": ObjectId(session_id)}
            )
            if not session:
                return None
            
            # Get endpoint usage
            pipeline = [
                {"$match": {"session_id": session_id}},
                {"$group": {
                    "_id": "$endpoint",
                    "count": {"$sum": 1}
                }}
            ]
            
            endpoint_usage = {}
            for doc in self.mongo.db[self.usage_collection].aggregate(pipeline):
                endpoint_usage[doc["_id"]] = doc["count"]
            
            # Calculate duration
            now = datetime.now(timezone.utc)
            duration_delta = now - session["created_at"]
            duration_hours = duration_delta.total_seconds() / 3600
            
            return SessionSummary(
                session_id=session_id,
                status=SessionStatus(session["status"]),
                tokens_used=session["tokens_used"],
                tokens_remaining=max(0, session["max_tokens"] - session["tokens_used"]),
                requests_count=session["requests_count"],
                duration_hours=duration_hours,
                endpoints_used=endpoint_usage,
                created_at=session["created_at"],
                expires_at=session["expires_at"]
            )
            
        except Exception as e:
            logger.error(f"Error getting session summary: {e}")
            return None
    
    async def list_sessions(self, api_key_id: str, 
                          skip: int = 0, 
                          limit: int = 100,
                          status: Optional[SessionStatus] = None) -> SessionList:
        """List sessions for an API key."""
        if not self.mongo:
            return SessionList(sessions=[], total=0, active_count=0)
        
        # Build query
        query = {"api_key_id": api_key_id}
        if status:
            query["status"] = status.value
        
        # Get total and active counts
        total = self.mongo.db[self.sessions_collection].count_documents(
            {"api_key_id": api_key_id}
        )
        active_count = self.mongo.db[self.sessions_collection].count_documents({
            "api_key_id": api_key_id,
            "status": SessionStatus.ACTIVE.value
        })
        
        # Get sessions with pagination
        cursor = self.mongo.db[self.sessions_collection].find(
            query
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        sessions = []
        for doc in cursor:
            sessions.append(self._doc_to_session_response(doc))
        
        return SessionList(
            sessions=sessions,
            total=total,
            active_count=active_count
        )
    
    async def terminate_session(self, session_id: str) -> bool:
        """Manually terminate a session."""
        if not self.mongo:
            return False
        
        try:
            result = self.mongo.db[self.sessions_collection].update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"status": SessionStatus.TERMINATED.value}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error terminating session: {e}")
            return False
    
    async def cleanup_expired_sessions(self) -> int:
        """Mark expired sessions as expired."""
        if not self.mongo:
            return 0
        
        now = datetime.now(timezone.utc)
        result = self.mongo.db[self.sessions_collection].update_many(
            {
                "status": SessionStatus.ACTIVE.value,
                "expires_at": {"$lt": now}
            },
            {"$set": {"status": SessionStatus.EXPIRED.value}}
        )
        
        return result.modified_count
    
    async def get_token_quota(self, api_key_id: str) -> Optional[TokenQuota]:
        """Get token quota for an API key."""
        if not self.mongo:
            return None
        
        doc = self.mongo.db[self.quotas_collection].find_one(
            {"api_key_id": api_key_id}
        )
        
        if not doc:
            # Create default quota
            doc = {
                "api_key_id": api_key_id,
                "total_sessions": 0,
                "used_sessions": 0,
                "remaining_sessions": 0,
                "total_tokens_purchased": 0,
                "total_tokens_used": 0,
                "last_purchase": None
            }
            self.mongo.db[self.quotas_collection].insert_one(doc)
        
        return TokenQuota(
            api_key_id=doc["api_key_id"],
            total_sessions=doc["total_sessions"],
            used_sessions=doc["used_sessions"],
            remaining_sessions=doc["remaining_sessions"],
            total_tokens_purchased=doc["total_tokens_purchased"],
            total_tokens_used=doc["total_tokens_used"],
            last_purchase=doc.get("last_purchase")
        )
    
    async def add_session_quota(self, api_key_id: str, sessions: int) -> TokenQuota:
        """Add sessions to an API key's quota."""
        if not self.mongo:
            raise ValueError("MongoDB connection not available")
        
        now = datetime.now(timezone.utc)
        tokens = sessions * 100000  # 100k tokens per session
        
        result = self.mongo.db[self.quotas_collection].update_one(
            {"api_key_id": api_key_id},
            {
                "$inc": {
                    "total_sessions": sessions,
                    "remaining_sessions": sessions,
                    "total_tokens_purchased": tokens
                },
                "$set": {
                    "last_purchase": now
                }
            },
            upsert=True
        )
        
        return await self.get_token_quota(api_key_id)
    
    async def _decrement_session_quota(self, api_key_id: str):
        """Decrement remaining sessions when a new session is created."""
        if not self.mongo:
            return
        
        self.mongo.db[self.quotas_collection].update_one(
            {"api_key_id": api_key_id},
            {
                "$inc": {
                    "used_sessions": 1,
                    "remaining_sessions": -1
                }
            }
        )
    
    def _doc_to_session_response(self, doc: Dict[str, Any]) -> SessionResponse:
        """Convert MongoDB document to SessionResponse."""
        return SessionResponse(
            id=str(doc["_id"]),
            api_key_id=doc["api_key_id"],
            name=doc.get("name"),
            status=SessionStatus(doc["status"]),
            tokens_used=doc["tokens_used"],
            max_tokens=doc["max_tokens"],
            requests_count=doc["requests_count"],
            created_at=doc["created_at"],
            expires_at=doc["expires_at"],
            last_activity=doc.get("last_activity")
        )
