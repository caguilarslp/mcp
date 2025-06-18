"""MongoDB repository implementation."""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from ...core.domain.entities import Trade

logger = logging.getLogger(__name__)


class MongoDBRepository:
    """MongoDB repository for trades data."""
    
    def __init__(self, connection_string: str, database_name: str = "wadm"):
        """Initialize MongoDB repository."""
        self.connection_string = connection_string
        self.database_name = database_name
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
        
    async def connect(self) -> None:
        """Connect to MongoDB."""
        try:
            self._client = AsyncIOMotorClient(self.connection_string)
            self._db = self._client[self.database_name]
            
            # Test connection
            await self._client.server_info()
            
            # Create indexes
            await self._create_indexes()
            
            logger.info(f"Connected to MongoDB database: {self.database_name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
            
    async def disconnect(self) -> None:
        """Disconnect from MongoDB."""
        if self._client:
            self._client.close()
            logger.info("Disconnected from MongoDB")
            
    async def _create_indexes(self) -> None:
        """Create database indexes."""
        trades_collection = self._db.trades
        
        # Create compound index for efficient queries
        await trades_collection.create_index([
            ("symbol", ASCENDING),
            ("timestamp", DESCENDING)
        ])
        
        # Create index for exchange queries
        await trades_collection.create_index([
            ("exchange", ASCENDING),
            ("timestamp", DESCENDING)
        ])
        
        # TTL index for automatic data cleanup (7 days)
        await trades_collection.create_index(
            "timestamp",
            expireAfterSeconds=7 * 24 * 3600
        )
        
        logger.info("MongoDB indexes created")
        
    async def save_trades(self, trades: List[Trade]) -> int:
        """Save multiple trades to database."""
        if not trades:
            return 0
            
        trades_collection = self._db.trades
        
        # Convert trades to documents
        documents = []
        for trade in trades:
            doc = trade.model_dump()
            # Ensure _id uniqueness using exchange + trade_id
            doc["_id"] = f"{trade.exchange}:{trade.trade_id}"
            documents.append(doc)
            
        try:
            # Use ordered=False to continue on duplicate key errors
            result = await trades_collection.insert_many(
                documents,
                ordered=False
            )
            inserted_count = len(result.inserted_ids)
            logger.debug(f"Inserted {inserted_count} trades")
            return inserted_count
        except Exception as e:
            # Count successful insertions even with duplicates
            if "duplicate key error" in str(e).lower():
                # This is expected for duplicate trades
                logger.debug(f"Some trades were duplicates: {e}")
                return 0
            else:
                logger.error(f"Failed to save trades: {e}")
                raise
                
    async def get_trades(
        self,
        symbol: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Trade]:
        """Get trades for a symbol within time range."""
        trades_collection = self._db.trades
        
        # Build query
        query: Dict[str, Any] = {"symbol": symbol}
        
        if start_time or end_time:
            time_query = {}
            if start_time:
                time_query["$gte"] = start_time
            if end_time:
                time_query["$lte"] = end_time
            query["timestamp"] = time_query
            
        # Execute query
        cursor = trades_collection.find(query).sort(
            "timestamp", DESCENDING
        ).limit(limit)
        
        # Convert documents to Trade objects
        trades = []
        async for doc in cursor:
            # Remove MongoDB _id field
            doc.pop("_id", None)
            trades.append(Trade(**doc))
            
        return trades
        
    async def get_latest_trade(self, symbol: str) -> Optional[Trade]:
        """Get the most recent trade for a symbol."""
        trades = await self.get_trades(symbol, limit=1)
        return trades[0] if trades else None
        
    async def get_trade_count(
        self,
        symbol: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        """Get count of trades for a symbol."""
        trades_collection = self._db.trades
        
        query: Dict[str, Any] = {"symbol": symbol}
        
        if start_time or end_time:
            time_query = {}
            if start_time:
                time_query["$gte"] = start_time
            if end_time:
                time_query["$lte"] = end_time
            query["timestamp"] = time_query
            
        return await trades_collection.count_documents(query)
        
    async def cleanup_old_trades(self, days: int = 7) -> int:
        """Manually cleanup trades older than specified days."""
        trades_collection = self._db.trades
        
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        result = await trades_collection.delete_many({
            "timestamp": {"$lt": cutoff_time}
        })
        
        deleted_count = result.deleted_count
        logger.info(f"Cleaned up {deleted_count} old trades")
        return deleted_count
