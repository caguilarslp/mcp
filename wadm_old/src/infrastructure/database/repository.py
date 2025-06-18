"""
Base repository with common database operations for WADM.

This module provides a base repository class with common CRUD operations
and query patterns that can be extended by specific repositories.
"""

from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from datetime import datetime, timedelta
from decimal import Decimal
from abc import ABC, abstractmethod

import structlog
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError, OperationFailure
from pydantic import BaseModel

from ...core.types import Symbol, Exchange

logger = structlog.get_logger()

T = TypeVar('T', bound=BaseModel)


class BaseRepository(Generic[T], ABC):
    """Base repository for MongoDB operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str, model_class: Type[T]):
        """Initialize repository.
        
        Args:
            db: MongoDB database instance
            collection_name: Name of the collection
            model_class: Pydantic model class for this repository
        """
        self.db = db
        self.collection_name = collection_name
        self.model_class = model_class
        self._collection: Optional[AsyncIOMotorCollection] = None
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        """Get collection instance."""
        if self._collection is None:
            self._collection = self.db[self.collection_name]
        return self._collection
    
    async def create(self, document: T) -> str:
        """Create a single document.
        
        Args:
            document: Pydantic model instance
            
        Returns:
            Inserted document ID
            
        Raises:
            DuplicateKeyError: If document violates unique constraints
        """
        try:
            doc_dict = document.model_dump(mode='json')
            
            # Convert Decimal to float for MongoDB
            doc_dict = self._convert_decimals_to_float(doc_dict)
            
            result = await self.collection.insert_one(doc_dict)
            
            logger.debug("Document created",
                        collection=self.collection_name,
                        id=str(result.inserted_id))
            
            return str(result.inserted_id)
            
        except DuplicateKeyError as e:
            logger.warning("Duplicate document creation attempted",
                          collection=self.collection_name,
                          error=str(e))
            raise
        except Exception as e:
            logger.error("Failed to create document",
                        collection=self.collection_name,
                        error=str(e))
            raise
    
    async def create_many(self, documents: List[T]) -> List[str]:
        """Create multiple documents in batch.
        
        Args:
            documents: List of Pydantic model instances
            
        Returns:
            List of inserted document IDs
        """
        if not documents:
            return []
        
        try:
            docs_dicts = []
            for doc in documents:
                doc_dict = doc.model_dump(mode='json')
                doc_dict = self._convert_decimals_to_float(doc_dict)
                docs_dicts.append(doc_dict)
            
            result = await self.collection.insert_many(docs_dicts, ordered=False)
            
            logger.debug("Documents created in batch",
                        collection=self.collection_name,
                        count=len(result.inserted_ids))
            
            return [str(id) for id in result.inserted_ids]
            
        except Exception as e:
            logger.error("Failed to create documents in batch",
                        collection=self.collection_name,
                        count=len(documents),
                        error=str(e))
            raise
    
    async def find_by_id(self, doc_id: str) -> Optional[T]:
        """Find document by ID.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document if found, None otherwise
        """
        try:
            from bson import ObjectId
            doc = await self.collection.find_one({"_id": ObjectId(doc_id)})
            
            if doc:
                doc = self._convert_floats_to_decimal(doc)
                return self.model_class.model_validate(doc)
            
            return None
            
        except Exception as e:
            logger.error("Failed to find document by ID",
                        collection=self.collection_name,
                        id=doc_id,
                        error=str(e))
            raise
    
    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[T]:
        """Find single document by filter.
        
        Args:
            filter_dict: MongoDB filter
            
        Returns:
            Document if found, None otherwise
        """
        try:
            doc = await self.collection.find_one(filter_dict)
            
            if doc:
                doc = self._convert_floats_to_decimal(doc)
                return self.model_class.model_validate(doc)
            
            return None
            
        except Exception as e:
            logger.error("Failed to find document",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def find_many(self,
                       filter_dict: Dict[str, Any],
                       limit: int = 100,
                       skip: int = 0,
                       sort: Optional[List[tuple]] = None) -> List[T]:
        """Find multiple documents.
        
        Args:
            filter_dict: MongoDB filter
            limit: Maximum number of documents
            skip: Number of documents to skip
            sort: Sort specification
            
        Returns:
            List of documents
        """
        try:
            cursor = self.collection.find(filter_dict)
            
            if sort:
                cursor = cursor.sort(sort)
            
            cursor = cursor.skip(skip).limit(limit)
            
            docs = await cursor.to_list(length=limit)
            
            # Convert and validate documents
            result = []
            for doc in docs:
                doc = self._convert_floats_to_decimal(doc)
                result.append(self.model_class.model_validate(doc))
            
            return result
            
        except Exception as e:
            logger.error("Failed to find documents",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> bool:
        """Update single document.
        
        Args:
            filter_dict: MongoDB filter
            update_dict: Update operations
            
        Returns:
            True if document was updated, False otherwise
        """
        try:
            update_dict = self._convert_decimals_to_float(update_dict)
            
            result = await self.collection.update_one(
                filter_dict,
                {"$set": update_dict}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error("Failed to update document",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def update_many(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> int:
        """Update multiple documents.
        
        Args:
            filter_dict: MongoDB filter
            update_dict: Update operations
            
        Returns:
            Number of documents updated
        """
        try:
            update_dict = self._convert_decimals_to_float(update_dict)
            
            result = await self.collection.update_many(
                filter_dict,
                {"$set": update_dict}
            )
            
            return result.modified_count
            
        except Exception as e:
            logger.error("Failed to update documents",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def delete_one(self, filter_dict: Dict[str, Any]) -> bool:
        """Delete single document.
        
        Args:
            filter_dict: MongoDB filter
            
        Returns:
            True if document was deleted, False otherwise
        """
        try:
            result = await self.collection.delete_one(filter_dict)
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error("Failed to delete document",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def delete_many(self, filter_dict: Dict[str, Any]) -> int:
        """Delete multiple documents.
        
        Args:
            filter_dict: MongoDB filter
            
        Returns:
            Number of documents deleted
        """
        try:
            result = await self.collection.delete_many(filter_dict)
            return result.deleted_count
            
        except Exception as e:
            logger.error("Failed to delete documents",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def count_documents(self, filter_dict: Dict[str, Any] = None) -> int:
        """Count documents matching filter.
        
        Args:
            filter_dict: MongoDB filter (empty dict for all documents)
            
        Returns:
            Number of documents
        """
        try:
            if filter_dict is None:
                filter_dict = {}
            
            return await self.collection.count_documents(filter_dict)
            
        except Exception as e:
            logger.error("Failed to count documents",
                        collection=self.collection_name,
                        filter=filter_dict,
                        error=str(e))
            raise
    
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline.
        
        Args:
            pipeline: MongoDB aggregation pipeline
            
        Returns:
            Aggregation results
        """
        try:
            cursor = self.collection.aggregate(pipeline)
            return await cursor.to_list(length=None)
            
        except Exception as e:
            logger.error("Failed to execute aggregation",
                        collection=self.collection_name,
                        pipeline=pipeline,
                        error=str(e))
            raise
    
    async def find_by_symbol_and_time_range(self,
                                          symbol: Symbol,
                                          start_time: datetime,
                                          end_time: datetime,
                                          exchange: Optional[Exchange] = None,
                                          limit: int = 1000) -> List[T]:
        """Find documents by symbol and time range.
        
        Args:
            symbol: Trading pair symbol
            start_time: Start of time range
            end_time: End of time range
            exchange: Optional exchange filter
            limit: Maximum number of documents
            
        Returns:
            List of documents in time range
        """
        filter_dict = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", DESCENDING)]
        )
    
    async def find_latest_by_symbol(self,
                                   symbol: Symbol,
                                   exchange: Optional[Exchange] = None,
                                   limit: int = 1) -> List[T]:
        """Find latest documents for a symbol.
        
        Args:
            symbol: Trading pair symbol
            exchange: Optional exchange filter
            limit: Number of latest documents to return
            
        Returns:
            List of latest documents
        """
        filter_dict = {"symbol": symbol}
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", DESCENDING)]
        )
    
    async def cleanup_old_data(self, days_to_keep: int) -> int:
        """Clean up data older than specified days.
        
        Args:
            days_to_keep: Number of days to keep
            
        Returns:
            Number of documents deleted
        """
        cutoff_time = datetime.utcnow() - timedelta(days=days_to_keep)
        
        filter_dict = {
            "timestamp": {"$lt": cutoff_time}
        }
        
        return await self.delete_many(filter_dict)
    
    def _convert_decimals_to_float(self, obj: Any) -> Any:
        """Convert Decimal objects to float for MongoDB storage."""
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_decimals_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimals_to_float(item) for item in obj]
        return obj
    
    def _convert_floats_to_decimal(self, obj: Any) -> Any:
        """Convert float objects back to Decimal for precise calculations."""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self._convert_floats_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_floats_to_decimal(item) for item in obj]
        return obj


class TimestampedRepository(BaseRepository[T]):
    """Repository for timestamped data with time-based queries."""
    
    async def find_in_time_range(self,
                                start_time: datetime,
                                end_time: datetime,
                                additional_filters: Optional[Dict[str, Any]] = None,
                                limit: int = 1000) -> List[T]:
        """Find documents in time range with optional additional filters."""
        filter_dict = {
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        if additional_filters:
            filter_dict.update(additional_filters)
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", ASCENDING)]
        )
    
    async def find_recent(self,
                         minutes: int = 60,
                         additional_filters: Optional[Dict[str, Any]] = None,
                         limit: int = 100) -> List[T]:
        """Find recent documents within specified minutes."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=minutes)
        
        return await self.find_in_time_range(
            start_time,
            end_time,
            additional_filters,
            limit
        )
    
    async def get_latest_timestamp(self, additional_filters: Optional[Dict[str, Any]] = None) -> Optional[datetime]:
        """Get the latest timestamp in the collection."""
        filter_dict = additional_filters or {}
        
        pipeline = [
            {"$match": filter_dict},
            {"$group": {
                "_id": None,
                "latest_timestamp": {"$max": "$timestamp"}
            }}
        ]
        
        result = await self.aggregate(pipeline)
        
        if result and result[0].get("latest_timestamp"):
            return result[0]["latest_timestamp"]
        
        return None


class SymbolExchangeRepository(TimestampedRepository[T]):
    """Repository for data organized by symbol and exchange."""
    
    async def find_by_symbol(self,
                            symbol: Symbol,
                            exchange: Optional[Exchange] = None,
                            limit: int = 100,
                            sort_desc: bool = True) -> List[T]:
        """Find documents by symbol, optionally filtered by exchange."""
        filter_dict = {"symbol": symbol}
        
        if exchange:
            filter_dict["exchange"] = exchange
        
        sort_order = DESCENDING if sort_desc else ASCENDING
        
        return await self.find_many(
            filter_dict,
            limit=limit,
            sort=[("timestamp", sort_order)]
        )
    
    async def get_symbols(self, exchange: Optional[Exchange] = None) -> List[str]:
        """Get list of unique symbols in the collection."""
        filter_dict = {}
        if exchange:
            filter_dict["exchange"] = exchange
        
        pipeline = [
            {"$match": filter_dict},
            {"$group": {"_id": "$symbol"}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await self.aggregate(pipeline)
        return [doc["_id"] for doc in result]
    
    async def get_exchanges(self) -> List[str]:
        """Get list of unique exchanges in the collection."""
        pipeline = [
            {"$group": {"_id": "$exchange"}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await self.aggregate(pipeline)
        return [doc["_id"] for doc in result]
