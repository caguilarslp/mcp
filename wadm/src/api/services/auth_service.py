"""
Authentication service for API key management.
"""
import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import logging

from src.api.models.auth import (
    APIKeyCreate, APIKeyResponse, APIKeyInfo, 
    APIKeyList, APIKeyVerifyResponse, PermissionLevel
)
from src.storage.mongo_manager import MongoManager

logger = logging.getLogger(__name__)


class AuthService:
    """Service for managing API authentication and keys."""
    
    def __init__(self, mongo_manager: Optional[MongoManager] = None):
        """Initialize auth service with MongoDB connection."""
        self.mongo = mongo_manager
        self.collection_name = "api_keys"
        
    async def _ensure_indexes(self):
        """Ensure necessary indexes exist for API keys collection."""
        if not self.mongo:
            return
            
        try:
            # Note: MongoManager uses pymongo, not motor, so no await needed
            collection = self.mongo.db[self.collection_name]
            # Index on key_hash for fast lookups
            collection.create_index("key_hash", unique=True)
            # Index on active status and expiration
            collection.create_index([("active", 1), ("expires_at", 1)])
            # Index on created_at for sorting
            collection.create_index([("created_at", -1)])
        except Exception as e:
            logger.error(f"Error creating API key indexes: {e}")
    
    def _generate_api_key(self) -> str:
        """Generate a secure API key."""
        # Generate 32 bytes of random data (256 bits)
        random_bytes = secrets.token_bytes(32)
        # Create a URL-safe string representation
        api_key = secrets.token_urlsafe(32)
        # Add a prefix for easy identification
        return f"wadm_{api_key}"
    
    def _hash_api_key(self, api_key: str) -> str:
        """Create a secure hash of the API key."""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    async def create_api_key(self, key_data: APIKeyCreate) -> APIKeyResponse:
        """Create a new API key."""
        if not self.mongo:
            raise ValueError("MongoDB connection not available")
        
        await self._ensure_indexes()
        
        # Generate new API key
        api_key = self._generate_api_key()
        key_hash = self._hash_api_key(api_key)
        
        # Create document
        doc = {
            "key_hash": key_hash,
            "name": key_data.name,
            "permissions": [p.value for p in key_data.permissions],
            "created_at": datetime.now(timezone.utc),
            "last_used": None,
            "expires_at": key_data.expires_at,
            "active": True,
            "usage_count": 0,
            "rate_limit_per_minute": key_data.rate_limit_per_minute,
            "rate_limit_per_hour": key_data.rate_limit_per_hour
        }
        
        try:
            # Insert into database (MongoManager uses sync pymongo)
            result = self.mongo.db[self.collection_name].insert_one(doc)
            
            # Return response with the actual key (only shown once)
            return APIKeyResponse(
                id=str(result.inserted_id),
                key=api_key,
                name=key_data.name,
                permissions=key_data.permissions,
                created_at=doc["created_at"],
                expires_at=doc["expires_at"]
            )
        except DuplicateKeyError:
            # Extremely unlikely but handle collision
            logger.error("API key collision detected, retrying...")
            return await self.create_api_key(key_data)
    
    async def verify_api_key(self, api_key: str) -> APIKeyVerifyResponse:
        """Verify an API key and return its details."""
        if not self.mongo:
            return APIKeyVerifyResponse(valid=False)
        
        key_hash = self._hash_api_key(api_key)
        
        # Find the key (MongoManager uses sync pymongo)
        doc = self.mongo.db[self.collection_name].find_one({
            "key_hash": key_hash,
            "active": True
        })
        
        if not doc:
            return APIKeyVerifyResponse(valid=False)
        
        # Check expiration
        if doc.get("expires_at") and doc["expires_at"] < datetime.now(timezone.utc):
            return APIKeyVerifyResponse(valid=False)
        
        # Update last used timestamp and usage count
        self.mongo.db[self.collection_name].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {"last_used": datetime.now(timezone.utc)},
                "$inc": {"usage_count": 1}
            }
        )
        
        
        # Get active session ID if any
        session_id = None
        if doc.get("expires_at") is None or doc["expires_at"] > datetime.now(timezone.utc):
            # Try to get active session for this key
            from src.api.services.session_service import SessionService
            try:
                session_service = SessionService(self.mongo)
                active_session = await session_service.get_active_session(str(doc["_id"]))
                if active_session:
                    session_id = active_session.id
            except Exception as e:
                logger.debug(f"Could not get active session: {e}")
        
        # Return verification result
        return APIKeyVerifyResponse(
            valid=True,
            key_id=str(doc["_id"]),
            permissions=[PermissionLevel(p) for p in doc.get("permissions", ["read"])],
            expires_at=doc.get("expires_at"),
            rate_limit_per_minute=doc.get("rate_limit_per_minute", 60),
            rate_limit_per_hour=doc.get("rate_limit_per_hour", 1000),
            session_id=session_id
        )
    
    async def list_api_keys(self, skip: int = 0, limit: int = 100) -> APIKeyList:
        """List all API keys (without the actual keys)."""
        if not self.mongo:
            return APIKeyList(keys=[], total=0)
        
        # Get total count
        total = self.mongo.db[self.collection_name].count_documents({})
        
        # Get keys with pagination
        cursor = self.mongo.db[self.collection_name].find(
            {},
            {"key_hash": 0}  # Don't return the hash
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        keys = []
        for doc in cursor:
            keys.append(APIKeyInfo(
                id=str(doc["_id"]),
                name=doc["name"],
                permissions=[PermissionLevel(p) for p in doc.get("permissions", ["read"])],
                created_at=doc["created_at"],
                last_used=doc.get("last_used"),
                expires_at=doc.get("expires_at"),
                active=doc.get("active", True),
                rate_limit_per_minute=doc.get("rate_limit_per_minute", 60),
                rate_limit_per_hour=doc.get("rate_limit_per_hour", 1000),
                usage_count=doc.get("usage_count", 0)
            ))
        
        return APIKeyList(keys=keys, total=total)
    
    async def get_api_key(self, key_id: str) -> Optional[APIKeyInfo]:
        """Get details for a specific API key."""
        if not self.mongo:
            return None
        
        try:
            from bson import ObjectId
            doc = self.mongo.db[self.collection_name].find_one(
                {"_id": ObjectId(key_id)},
                {"key_hash": 0}
            )
            
            if not doc:
                return None
            
            return APIKeyInfo(
                id=str(doc["_id"]),
                name=doc["name"],
                permissions=[PermissionLevel(p) for p in doc.get("permissions", ["read"])],
                created_at=doc["created_at"],
                last_used=doc.get("last_used"),
                expires_at=doc.get("expires_at"),
                active=doc.get("active", True),
                rate_limit_per_minute=doc.get("rate_limit_per_minute", 60),
                rate_limit_per_hour=doc.get("rate_limit_per_hour", 1000),
                usage_count=doc.get("usage_count", 0)
            )
        except Exception as e:
            logger.error(f"Error getting API key: {e}")
            return None
    
    async def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key."""
        if not self.mongo:
            return False
        
        try:
            from bson import ObjectId
            result = self.mongo.db[self.collection_name].update_one(
                {"_id": ObjectId(key_id)},
                {"$set": {"active": False}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error revoking API key: {e}")
            return False
    
    async def cleanup_expired_keys(self) -> int:
        """Clean up expired API keys."""
        if not self.mongo:
            return 0
        
        now = datetime.now(timezone.utc)
        result = self.mongo.db[self.collection_name].update_many(
            {
                "expires_at": {"$lt": now},
                "active": True
            },
            {"$set": {"active": False}}
        )
        
        return result.modified_count
