"""
MongoDB Audit Logger for LLM Service
Uses existing WADM MongoDB connection for audit logging
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from bson import ObjectId
import json

from .config import LLMConfig
from .models import ChatRequest, ChatResponse
from src.storage.mongo_manager import MongoManager
from src.logger import get_logger

logger = get_logger(__name__)


class MongoAuditLogger:
    """
    MongoDB-based audit logger for LLM service
    Uses existing WADM MongoDB connection for consistency
    """
    
    def __init__(self):
        """Initialize audit logger using existing MongoDB connection"""
        self.config = LLMConfig()
        self.mongo_manager = None
        self.collection_name = "llm_audit"
        self._connect_mongo()
    
    def _connect_mongo(self):
        """Connect to MongoDB using existing manager"""
        try:
            self.mongo_manager = MongoManager()
            logger.info("✅ MongoDB audit logger connected successfully")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
            self.mongo_manager = None
    
    def log_request(
        self,
        user_id: str,
        request: ChatRequest,
        client_ip: str = None,
        user_agent: str = None
    ) -> str:
        """
        Log LLM request (synchronous version)
        
        Args:
            user_id: User identifier
            request: Chat request object
            client_ip: Client IP address
            user_agent: User agent string
            
        Returns:
            Audit log ID
        """
        if not self.mongo_manager:
            logger.warning("MongoDB not available, skipping audit log")
            return ""
        
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
                    "include_indicators": request.include_indicators,
                    "include_market_data": request.include_market_data
                },
                "client_info": {
                    "ip_address": client_ip,
                    "user_agent": user_agent[:200] if user_agent else None
                },
                "status": "initiated"
            }
            
            # Insert into audit collection
            result = self.mongo_manager.insert_document(self.collection_name, audit_record)
            
            if result:
                logger.debug(f"Logged LLM request for user {user_id}: {audit_record['_id']}")
                return str(audit_record["_id"])
            else:
                logger.error("Failed to insert audit record")
                return ""
            
        except Exception as e:
            logger.error(f"Error logging LLM request: {str(e)}")
            return ""
    
    def log_response(
        self,
        audit_id: str,
        user_id: str,
        response: ChatResponse = None,
        success: bool = False,
        error_message: Optional[str] = None
    ) -> None:
        """
        Log LLM response (synchronous version)
        
        Args:
            audit_id: Audit log ID from request
            user_id: User identifier
            response: Chat response object
            success: Whether request was successful
            error_message: Error message if failed
        """
        if not self.mongo_manager or not audit_id:
            logger.warning("MongoDB not available or invalid audit_id, skipping response log")
            return
        
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
            
            # Update the document
            result = self.mongo_manager.update_document(
                self.collection_name,
                {"_id": ObjectId(audit_id)},
                update_data
            )
            
            if result:
                logger.debug(f"Logged LLM response for user {user_id}: {success}")
            else:
                logger.error(f"Failed to update audit record {audit_id}")
            
        except Exception as e:
            logger.error(f"Error logging LLM response: {str(e)}")
    
    def log_rate_limit_exceeded(
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
        if not self.mongo_manager:
            logger.warning("MongoDB not available, skipping rate limit log")
            return
        
        try:
            audit_record = {
                "event_type": "rate_limit_exceeded",
                "user_id": user_id,
                "timestamp": datetime.now(),
                "limit_type": limit_type,
                "current_usage": current_usage,
                "client_ip": client_ip
            }
            
            result = self.mongo_manager.insert_document(self.collection_name, audit_record)
            
            if result:
                logger.warning(f"Rate limit exceeded for user {user_id}: {limit_type}")
            else:
                logger.error("Failed to log rate limit exceeded event")
            
        except Exception as e:
            logger.error(f"Error logging rate limit exceeded: {str(e)}")
    
    def log_security_event(
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
        if not self.mongo_manager:
            logger.warning("MongoDB not available, skipping security event log")
            return
        
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
            
            result = self.mongo_manager.insert_document(self.collection_name, audit_record)
            
            if result:
                logger.warning(f"Security event for user {user_id}: {event_type}")
            else:
                logger.error("Failed to log security event")
            
        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")
    
    def get_user_audit_history(
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
        if not self.mongo_manager:
            logger.warning("MongoDB not available")
            return []
        
        try:
            # Build query
            query = {"user_id": user_id}
            if event_type:
                query["event_type"] = event_type
            
            # Execute query
            records = self.mongo_manager.find_documents(
                self.collection_name,
                query,
                limit=limit,
                skip=offset,
                sort=[("timestamp", -1)]
            )
            
            # Convert ObjectId to string for JSON serialization
            for record in records:
                if "_id" in record:
                    record["_id"] = str(record["_id"])
                if "timestamp" in record:
                    record["timestamp"] = record["timestamp"].isoformat()
                if "completed_at" in record and record["completed_at"]:
                    record["completed_at"] = record["completed_at"].isoformat()
            
            return records
            
        except Exception as e:
            logger.error(f"Error getting audit history for user {user_id}: {str(e)}")
            return []
    
    def get_usage_analytics(
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
        if not self.mongo_manager:
            logger.warning("MongoDB not available")
            return {"error": "MongoDB not available"}
        
        try:
            # Default to last 30 days
            if not end_date:
                end_date = datetime.now()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Build query for aggregation
            match_stage = {
                "event_type": "llm_request",
                "timestamp": {"$gte": start_date, "$lte": end_date}
            }
            if user_id:
                match_stage["user_id"] = user_id
            
            # For simplicity, we'll do basic counting without aggregation pipeline
            # In a real implementation, you'd use MongoDB aggregation
            
            # Count total requests
            total_requests = len(self.mongo_manager.find_documents(
                self.collection_name, match_stage, limit=10000
            ))
            
            # Count successful requests
            success_query = match_stage.copy()
            success_query["success"] = True
            successful_requests = len(self.mongo_manager.find_documents(
                self.collection_name, success_query, limit=10000
            ))
            
            # Calculate basic analytics
            analytics = {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "success_rate": successful_requests / total_requests if total_requests > 0 else 0.0,
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {str(e)}")
            return {"error": str(e)}
    
    def cleanup_old_logs(self, days_to_keep: int = 90) -> int:
        """
        Clean up old audit logs
        
        Args:
            days_to_keep: Number of days to keep
            
        Returns:
            Number of logs deleted
        """
        if not self.mongo_manager:
            logger.warning("MongoDB not available")
            return 0
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            # Count documents to delete
            count_query = {"timestamp": {"$lt": cutoff_date}}
            old_records = self.mongo_manager.find_documents(
                self.collection_name, count_query, limit=10000
            )
            
            # Delete old records
            for record in old_records:
                self.mongo_manager.delete_document(
                    self.collection_name,
                    {"_id": record["_id"]}
                )
            
            deleted_count = len(old_records)
            logger.info(f"Cleaned up {deleted_count} old audit logs")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {str(e)}")
            return 0
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for audit logger"""
        try:
            if not self.mongo_manager:
                return {
                    "status": "unhealthy",
                    "mongodb_connected": False,
                    "error": "MongoDB manager not initialized"
                }
            
            # Test basic operations
            test_record = {
                "event_type": "health_check",
                "timestamp": datetime.now(),
                "test": True
            }
            
            # Insert test record
            result = self.mongo_manager.insert_document(self.collection_name, test_record)
            
            if result:
                # Delete test record
                self.mongo_manager.delete_document(
                    self.collection_name,
                    {"_id": test_record["_id"]}
                )
                
                # Get collection stats
                stats_query = {"event_type": {"$ne": "health_check"}}
                total_records = len(self.mongo_manager.find_documents(
                    self.collection_name, stats_query, limit=10000
                ))
                
                return {
                    "status": "healthy",
                    "mongodb_connected": True,
                    "total_audit_records": total_records
                }
            else:
                return {
                    "status": "unhealthy",
                    "mongodb_connected": False,
                    "error": "Failed to insert test record"
                }
            
        except Exception as e:
            logger.error(f"Audit logger health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "mongodb_connected": False,
                "error": str(e)
            } 