"""
MongoDB Manager for API with optional MongoDB support
Wrapper that works even without MongoDB for development
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

try:
    from src.config import Config
    from src.storage import StorageManager
    MONGODB_AVAILABLE = True
except Exception as e:
    logger.warning(f"MongoDB not available: {e}")
    MONGODB_AVAILABLE = False


class MongoManager:
    """
    MongoDB manager for API endpoints
    Works with or without MongoDB for development
    """
    
    def __init__(self):
        self.config = Config() if 'Config' in globals() else None
        self.storage = None
        self.connected = False
        
        try:
            if MONGODB_AVAILABLE:
                self.storage = StorageManager()
                self.client = self.storage.client
                self.db = self.storage.db
                
                # Direct access to collections
                self.trades = self.storage.trades
                self.volume_profiles = self.storage.volume_profiles
                self.order_flows = self.storage.order_flows
                self.smc_analyses = self.storage.smc_analyses
                self.connected = True
                logger.info("MongoDB connected successfully")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}. Running in mock mode.")
            self.connected = False
            
            # Mock collections for development
            class MockCollection:
                def find(self, *args, **kwargs):
                    return MockCursor()
                    
                def find_one(self, *args, **kwargs):
                    return None
                    
                def count_documents(self, *args, **kwargs):
                    return 0
                    
                def aggregate(self, *args, **kwargs):
                    return []
                    
                def insert_one(self, *args, **kwargs):
                    return None
                    
                def insert_many(self, *args, **kwargs):
                    return None
            
            class MockCursor:
                def sort(self, *args, **kwargs):
                    return self
                    
                def skip(self, *args, **kwargs):
                    return self
                    
                def limit(self, *args, **kwargs):
                    return self
                    
                def __iter__(self):
                    return iter([])
            
            class MockDB:
                def __getitem__(self, name):
                    return MockCollection()
                    
                def command(self, *args, **kwargs):
                    return {"storageSize": 0}
            
            # Set up mocks
            self.db = MockDB()
            self.trades = MockCollection()
            self.volume_profiles = MockCollection()
            self.order_flows = MockCollection()
            self.smc_analyses = MockCollection()
    
    def get_trades(self, query: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get trades with pagination"""
        if not self.connected:
            return []
        cursor = self.trades.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        return list(cursor)
    
    def count_trades(self, query: Dict[str, Any]) -> int:
        """Count trades matching query"""
        if not self.connected:
            return 0
        return self.trades.count_documents(query)
    
    def aggregate_trades(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Aggregate trades data"""
        if not self.connected:
            return []
        return list(self.trades.aggregate(pipeline))
    
    def get_latest_indicator(self, collection_name: str, symbol: str, exchange: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get latest indicator data"""
        if not self.connected:
            return None
        collection = self.db[collection_name]
        query = {"symbol": symbol}
        if exchange:
            query["exchange"] = exchange
        
        return collection.find_one(query, sort=[("timestamp", -1)])
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        if not self.connected:
            return {
                "connected": False,
                "message": "MongoDB not available - running in development mode"
            }
        
        if self.storage:
            return self.storage.get_stats()
        else:
            return {
                "trades_count": 0,
                "volume_profiles_count": 0,
                "order_flows_count": 0,
                "smc_analyses_count": 0,
                "db_stats": {"storageSize": 0}
            }
    
    def close(self):
        """Close connection"""
        if self.storage:
            self.storage.close()
