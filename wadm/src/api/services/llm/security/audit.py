"""
MongoDB Audit Logger for LLM Service
Comprehensive logging for compliance and usage tracking
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from bson import ObjectId
import json

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from ..config import LLMConfig
from ..models import ChatRequest, ChatResponse
from src.logger import get_logger

logger = get_logger(__name__)


class AuditLogger:
    """
    MongoDB-based audit logger for LLM service
    Provides comprehensive logging for compliance and analytics
    """
    
    def __init__(self, mongodb_url: str = None):
        """Initialize audit logger"""
        self.config = LLMConfig()
        self.mongodb_url = mongodb_url or "mongodb://wadm:wadm_secure_2024@mongo:27017/wadm?authSource=admin"
        self.client = None
        self.db = None
        self._initialize_mongodb()
    
    def _initialize_mongodb(self):
        """Initialize MongoDB connection"""
        try:
            self.client = AsyncIOMotorClient(self.mongodb_url)
            self.db = self.client.wadm
            logger.info("✅ MongoDB audit logger initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize MongoDB: {str(e)}")
            raise Exception(f"MongoDB connection failed: {str(e)}")
    
    async def log_request(
        self,
        user_id: str,
        request: ChatRequest,
        client_ip: str = None,
        user_agent: str = None
    ) -> str:
        """
        Log LLM request
        
        Args:
            user_id: User identifier
            request: Chat request object
            client_ip: Client IP address
            user_agent: User agent string
            
        Returns:
            Audit log ID
        """
        try:
            # Create audit record
            audit_record = {
                "_id": ObjectId(),
                "event_type": "llm_request",
                "user_id": user_id,
                "timestamp": datetime.now(),
                "request_data": {
                    "message": request.message[:self.config.LOG_QUERY_PREVIEW_LENGTH] + "..." 
                              if len(request.message) > self.config.LOG_QUERY_PREVIEW_LENGTH 
                              else request.message,
                    "message_length": len(request.message),
                    "symbol": request.symbol,
                    "provider": request.provider.value if request.provider else None,
                    "include_context": request.include_context,
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens
                },
                "client_info": {
                    "ip_address": client_ip,
                    "user_agent": user_agent[:200] if user_agent else None  # Truncate long user agents
                },
                "status": "initiated"
            }
            
            # Insert into audit collection
            result = await self.db.llm_audit.insert_one(audit_record)
            
            logger.debug(f"Logged LLM request for user {user_id}: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Error logging LLM request: {str(e)}")
            return ""
    
    async def log_response(
        self,
        audit_id: str,
        user_id: str,
        response: ChatResponse,
        success: bool,
        error_message: Optional[str] = None
    ) -> None:
        """
        Log LLM response
        
        Args:
            audit_id: Audit log ID from request
            user_id: User identifier
            response: Chat response object
            success: Whether request was successful
            error_message: Error message if failed
        """
        try:
            # Build response data
            response_data = {}
            if success and response:
                response_data = {
                    "response_length": len(response.response),
                    "provider_used": response.provider_used.value if response.provider_used else None,
                    "tokens_used": response.tokens_used,
                    "cost_usd": float(response.cost_usd),
                    "processing_time_ms": response.processing_time_ms,
                    "context_symbols": response.context_symbols
                }
            
            # Update audit record
            update_data = {
                "$set": {
                    "status": "completed" if success else "failed",
                    "completed_at": datetime.now(),
                    "response_data": response_data,
                    "error_message": error_message,
                    "success": success
                }
            }
            
            if audit_id:
                await self.db.llm_audit.update_one(
                    {"_id": ObjectId(audit_id)},
                    update_data
                )
            
            logger.debug(f"Logged LLM response for user {user_id}: {success}")
            
        except Exception as e:
            logger.error(f"Error logging LLM response: {str(e)}")
    
    async def log_rate_limit_exceeded(
        self,
        user_id: str,
        limit_type: str,
        current_usage: Dict[str, Any],
        client_ip: str = None
    ) -> None:
        """
        Log rate limit exceeded event
        
        Args:
            user_id: User identifier
            limit_type: Type of limit exceeded
            current_usage: Current usage stats
            client_ip: Client IP address
        """
        try:
            audit_record = {
                "event_type": "rate_limit_exceeded",
                "user_id": user_id,
                "timestamp": datetime.now(),
                "limit_type": limit_type,
                "current_usage": current_usage,
                "client_ip": client_ip
            }
            
            await self.db.llm_audit.insert_one(audit_record)
            logger.warning(f"Rate limit exceeded for user {user_id}: {limit_type}")
            
        except Exception as e:
            logger.error(f"Error logging rate limit exceeded: {str(e)}")
    
    async def log_security_event(
        self,
        user_id: str,
        event_type: str,
        details: Dict[str, Any],
        client_ip: str = None,
        user_agent: str = None
    ) -> None:
        """
        Log security event
        
        Args:
            user_id: User identifier
            event_type: Type of security event
            details: Event details
            client_ip: Client IP address
            user_agent: User agent string
        """
        try:
            audit_record = {
                "event_type": f"security_{event_type}",
                "user_id": user_id,
                "timestamp": datetime.now(),
                "details": details,
                "client_info": {
                    "ip_address": client_ip,
                    "user_agent": user_agent[:200] if user_agent else None
                }
            }
            
            await self.db.llm_audit.insert_one(audit_record)
            logger.warning(f"Security event for user {user_id}: {event_type}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")
    
    async def get_user_audit_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        event_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get audit history for user
        
        Args:
            user_id: User identifier
            limit: Maximum number of records
            offset: Number of records to skip
            event_type: Filter by event type
            
        Returns:
            List of audit records
        """
        try:
            # Build query
            query = {"user_id": user_id}
            if event_type:
                query["event_type"] = event_type
            
            # Execute query
            cursor = self.db.llm_audit.find(query).sort("timestamp", -1).skip(offset).limit(limit)
            records = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for record in records:
                record["_id"] = str(record["_id"])
                if "timestamp" in record:
                    record["timestamp"] = record["timestamp"].isoformat()
                if "completed_at" in record and record["completed_at"]:
                    record["completed_at"] = record["completed_at"].isoformat()
            
            return records
            
        except Exception as e:
            logger.error(f"Error getting audit history for user {user_id}: {str(e)}")
            return []
    
    async def get_usage_analytics(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get usage analytics
        
        Args:
            user_id: User identifier (optional, for all users if None)
            start_date: Start date for analysis
            end_date: End date for analysis
            
        Returns:
            Analytics data
        """
        try:
            # Default to last 30 days
            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Build match stage
            match_stage = {
                "event_type": "llm_request",
                "timestamp": {"$gte": start_date, "$lte": end_date}
            }
            if user_id:
                match_stage["user_id"] = user_id
            
            # Aggregation pipeline
            pipeline = [
                {"$match": match_stage},
                {
                    "$group": {
                        "_id": None,
                        "total_requests": {"$sum": 1},
                        "successful_requests": {
                            "$sum": {"$cond": [{"$eq": ["$success", True]}, 1, 0]}
                        },
                        "total_tokens": {"$sum": "$response_data.tokens_used"},
                        "total_cost": {"$sum": "$response_data.cost_usd"},
                        "avg_processing_time": {"$avg": "$response_data.processing_time_ms"},
                        "providers_used": {"$addToSet": "$response_data.provider_used"}
                    }
                }
            ]
            
            # Execute aggregation
            cursor = self.db.llm_audit.aggregate(pipeline)
            results = await cursor.to_list(length=1)
            
            if results:
                analytics = results[0]
                analytics.pop("_id", None)
                
                # Calculate success rate
                if analytics["total_requests"] > 0:
                    analytics["success_rate"] = (
                        analytics["successful_requests"] / analytics["total_requests"]
                    )
                else:
                    analytics["success_rate"] = 0.0
                
                # Clean up None values
                for key, value in analytics.items():
                    if value is None:
                        analytics[key] = 0
                
                return analytics
            else:
                return {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "total_tokens": 0,
                    "total_cost": 0.0,
                    "avg_processing_time": 0.0,
                    "success_rate": 0.0,
                    "providers_used": []
                }
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {str(e)}")
            return {"error": str(e)}
    
    async def get_top_users(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get top users by usage
        
        Args:
            limit: Maximum number of users to return
            
        Returns:
            List of top users with usage stats
        """
        try:
            # Last 30 days
            start_date = datetime.now() - timedelta(days=30)
            
            pipeline = [
                {
                    "$match": {
                        "event_type": "llm_request",
                        "timestamp": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$user_id",
                        "total_requests": {"$sum": 1},
                        "successful_requests": {
                            "$sum": {"$cond": [{"$eq": ["$success", True]}, 1, 0]}
                        },
                        "total_tokens": {"$sum": "$response_data.tokens_used"},
                        "total_cost": {"$sum": "$response_data.cost_usd"},
                        "last_request": {"$max": "$timestamp"}
                    }
                },
                {"$sort": {"total_requests": -1}},
                {"$limit": limit}
            ]
            
            cursor = self.db.llm_audit.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            
            # Format results
            for result in results:
                result["user_id"] = result.pop("_id")
                if result["last_request"]:
                    result["last_request"] = result["last_request"].isoformat()
                
                # Calculate success rate
                if result["total_requests"] > 0:
                    result["success_rate"] = (
                        result["successful_requests"] / result["total_requests"]
                    )
                else:
                    result["success_rate"] = 0.0
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting top users: {str(e)}")
            return []
    
    async def cleanup_old_logs(self, days_to_keep: int = 90) -> int:
        """
        Clean up old audit logs
        
        Args:
            days_to_keep: Number of days to keep
            
        Returns:
            Number of logs deleted
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            result = await self.db.llm_audit.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            deleted_count = result.deleted_count
            logger.info(f"Cleaned up {deleted_count} old audit logs")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {str(e)}")
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for audit logger"""
        try:
            # Test MongoDB connection
            await self.client.admin.command('ping')
            
            # Test basic operations
            test_record = {
                "event_type": "health_check",
                "timestamp": datetime.now(),
                "test": True
            }
            
            result = await self.db.llm_audit.insert_one(test_record)
            await self.db.llm_audit.delete_one({"_id": result.inserted_id})
            
            # Get collection stats
            stats = await self.db.llm_audit.count_documents({})
            
            return {
                "status": "healthy",
                "mongodb_connected": True,
                "total_audit_records": stats
            }
            
        except Exception as e:
            logger.error(f"Audit logger health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "mongodb_connected": False,
                "error": str(e)
            } 