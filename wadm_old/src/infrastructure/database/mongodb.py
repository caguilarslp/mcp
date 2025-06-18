"""
MongoDB client implementation with connection pooling and health checks
"""

from typing import Any, Dict, List, Optional

import structlog
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = structlog.get_logger()


class MongoDBClient:
    """Async MongoDB client with connection management."""
    
    def __init__(self, connection_url: str):
        """Initialize MongoDB client.
        
        Args:
            connection_url: MongoDB connection string
        """
        self.connection_url = connection_url
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
    
    async def connect(self) -> None:
        """Establish connection to MongoDB."""
        try:
            self._client = AsyncIOMotorClient(
                self.connection_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=300000,  # 5 minutes
                retryWrites=True,
                retryReads=True
            )
            
            # Test connection
            await self._client.admin.command('ping')
            
            # Get database from connection string
            self._db = self._client.get_default_database()
            
            logger.info("MongoDB connection established",
                       database=self._db.name)
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error("Failed to connect to MongoDB", error=str(e))
            raise
    
    async def disconnect(self) -> None:
        """Close MongoDB connection."""
        if self._client:
            self._client.close()
            logger.info("MongoDB connection closed")
    
    @property
    def db(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if not self._db:
            raise RuntimeError("MongoDB not connected. Call connect() first.")
        return self._db
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on MongoDB connection."""
        try:
            # Ping the server
            result = await self._client.admin.command('ping')
            
            # Get server info
            server_info = await self._client.server_info()
            
            # Get database stats
            db_stats = await self._db.command('dbStats')
            
            return {
                "status": "healthy",
                "ping": result.get('ok') == 1,
                "version": server_info.get('version'),
                "collections": db_stats.get('collections'),
                "dataSize": db_stats.get('dataSize'),
                "indexSize": db_stats.get('indexSize')
            }
        except Exception as e:
            logger.error("MongoDB health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def create_indexes(self) -> None:
        """Create required indexes for all collections."""
        try:
            # Trades indexes
            await self.db.trades.create_index([
                ("metadata.symbol", 1),
                ("timestamp", -1)
            ])
            await self.db.trades.create_index([
                ("metadata.exchange", 1),
                ("timestamp", -1)
            ])
            
            # Volume profiles indexes
            await self.db.volume_profiles.create_index([
                ("symbol", 1),
                ("timeframe", 1),
                ("timestamp", -1)
            ])
            
            # Order flow indexes
            await self.db.order_flow.create_index([
                ("symbol", 1),
                ("timestamp", -1)
            ])
            
            logger.info("MongoDB indexes created successfully")
            
        except Exception as e:
            logger.error("Failed to create indexes", error=str(e))
            raise
    
    async def insert_many(self, collection: str, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents into a collection.
        
        Args:
            collection: Collection name
            documents: List of documents to insert
            
        Returns:
            List of inserted document IDs
        """
        try:
            result = await self.db[collection].insert_many(documents)
            return [str(id) for id in result.inserted_ids]
        except Exception as e:
            logger.error(f"Failed to insert documents into {collection}", 
                        error=str(e), 
                        count=len(documents))
            raise
    
    async def find_one(self, collection: str, filter: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document in a collection.
        
        Args:
            collection: Collection name
            filter: Query filter
            
        Returns:
            Document if found, None otherwise
        """
        try:
            return await self.db[collection].find_one(filter)
        except Exception as e:
            logger.error(f"Failed to find document in {collection}", 
                        error=str(e), 
                        filter=filter)
            raise
    
    async def find_many(self, 
                       collection: str, 
                       filter: Dict[str, Any],
                       limit: int = 100,
                       sort: Optional[List[tuple]] = None) -> List[Dict[str, Any]]:
        """Find multiple documents in a collection.
        
        Args:
            collection: Collection name
            filter: Query filter
            limit: Maximum number of documents to return
            sort: Sort specification
            
        Returns:
            List of documents
        """
        try:
            cursor = self.db[collection].find(filter)
            
            if sort:
                cursor = cursor.sort(sort)
            
            cursor = cursor.limit(limit)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Failed to find documents in {collection}", 
                        error=str(e), 
                        filter=filter)
            raise
