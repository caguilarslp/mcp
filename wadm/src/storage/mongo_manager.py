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
                # Try simple connection first
                from pymongo import MongoClient
                import os
                
                # Use simple MongoDB URL for development
                mongo_url = os.getenv("MONGODB_URL", "mongodb://mongodb:27017/wadm")
                
                # Quick connection test
                test_client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
                test_client.server_info()
                test_client.close()
                
                # If test passed, create storage
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
    
    async def get_latest_volume_profile(self, symbol: str, exchange: Optional[str] = None) -> Optional[Any]:
        """Get latest volume profile for symbol"""
        if not self.connected:
            return None
        
        query = {"symbol": symbol}
        if exchange:
            query["exchange"] = exchange
        
        result = self.volume_profiles.find_one(query, sort=[("timestamp", -1)])
        if result:
            # Convert to object with attributes for API compatibility
            class VolumeProfile:
                def __init__(self, data):
                    self.timestamp = data.get('timestamp')
                    self.poc = data.get('poc')
                    self.vah = data.get('vah')
                    self.val = data.get('val')
                    self.total_volume = data.get('total_volume')
                    self.volume_nodes = data.get('volume_nodes', [])
            
            return VolumeProfile(result)
        return None
    
    async def get_latest_order_flow(self, symbol: str, exchange: Optional[str] = None) -> Optional[Any]:
        """Get latest order flow for symbol"""
        if not self.connected:
            return None
        
        query = {"symbol": symbol}
        if exchange:
            query["exchange"] = exchange
        
        result = self.order_flows.find_one(query, sort=[("timestamp", -1)])
        if result:
            # Convert to object with attributes for API compatibility
            class OrderFlow:
                def __init__(self, data):
                    self.timestamp = data.get('timestamp')
                    self.delta = data.get('delta')
                    self.cumulative_delta = data.get('cumulative_delta')
                    self.buy_volume = data.get('buy_volume')
                    self.sell_volume = data.get('sell_volume')
                    self.absorption_events = data.get('absorption_events')
                    self.momentum_score = data.get('momentum_score', 0.0)
            
            return OrderFlow(result)
        return None
    
    async def get_volume_profiles(self, symbol: str, start_time: datetime, end_time: datetime, limit: int = 100) -> List[Any]:
        """Get volume profiles in time range"""
        if not self.connected:
            return []
        
        query = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        cursor = self.volume_profiles.find(query).sort("timestamp", -1).limit(limit)
        results = []
        
        for doc in cursor:
            class VolumeProfile:
                def __init__(self, data):
                    self.timestamp = data.get('timestamp')
                    self.poc = data.get('poc')
                    self.vah = data.get('vah')
                    self.val = data.get('val')
                    self.total_volume = data.get('total_volume')
                    self.volume_nodes = data.get('volume_nodes', [])
            
            results.append(VolumeProfile(doc))
        
        return results
    
    async def get_order_flows(self, symbol: str, start_time: datetime, end_time: datetime, limit: int = 100) -> List[Any]:
        """Get order flows in time range"""
        if not self.connected:
            return []
        
        query = {
            "symbol": symbol,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }
        
        cursor = self.order_flows.find(query).sort("timestamp", -1).limit(limit)
        results = []
        
        for doc in cursor:
            class OrderFlow:
                def __init__(self, data):
                    self.timestamp = data.get('timestamp')
                    self.delta = data.get('delta')
                    self.cumulative_delta = data.get('cumulative_delta')
                    self.buy_volume = data.get('buy_volume')
                    self.sell_volume = data.get('sell_volume')
                    self.absorption_events = data.get('absorption_events')
                    self.momentum_score = data.get('momentum_score', 0.0)
            
            results.append(OrderFlow(doc))
        
        return results
    
    def close(self):
        """Close connection"""
        if self.storage:
            self.storage.close()
