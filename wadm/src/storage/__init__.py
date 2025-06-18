"""
Simple MongoDB storage manager
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import pymongo
from pymongo import MongoClient
from src.config import MONGODB_URL, TRADES_RETENTION, INDICATORS_RETENTION
from src.logger import get_logger
from src.models import Trade, VolumeProfile, OrderFlow

logger = get_logger(__name__)

class StorageManager:
    def __init__(self):
        self.client = MongoClient(MONGODB_URL)
        self.db = self.client.wadm
        
        # Collections
        self.trades = self.db.trades
        self.volume_profiles = self.db.volume_profiles
        self.order_flows = self.db.order_flows
        
        # Create indexes
        self._create_indexes()
        
        logger.info("Storage manager initialized")
    
    def _create_indexes(self):
        """Create necessary indexes"""
        # Trades indexes
        self.trades.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
        self.trades.create_index([("timestamp", 1)], expireAfterSeconds=TRADES_RETENTION)
        
        # Indicators indexes
        self.volume_profiles.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
        self.volume_profiles.create_index([("timestamp", 1)], expireAfterSeconds=INDICATORS_RETENTION)
        
        self.order_flows.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
        self.order_flows.create_index([("timestamp", 1)], expireAfterSeconds=INDICATORS_RETENTION)
    
    def save_trades(self, trades: List[Trade]) -> int:
        """Save batch of trades"""
        if not trades:
            return 0
        
        try:
            docs = [t.to_dict() for t in trades]
            result = self.trades.insert_many(docs)
            return len(result.inserted_ids)
        except Exception as e:
            logger.error(f"Error saving trades: {e}")
            return 0
    
    def get_recent_trades(self, symbol: str, exchange: str, minutes: int = 5) -> List[Dict[str, Any]]:
        """Get recent trades for analysis"""
        since = datetime.utcnow() - timedelta(minutes=minutes)
        
        cursor = self.trades.find({
            "symbol": symbol,
            "exchange": exchange,
            "timestamp": {"$gte": since}
        }).sort("timestamp", -1)
        
        return list(cursor)
    
    def save_volume_profile(self, profile: VolumeProfile):
        """Save volume profile"""
        try:
            self.volume_profiles.insert_one(profile.to_dict())
            logger.debug(f"Saved volume profile for {profile.symbol}")
        except Exception as e:
            logger.error(f"Error saving volume profile: {e}")
    
    def save_order_flow(self, flow: OrderFlow):
        """Save order flow"""
        try:
            self.order_flows.insert_one(flow.to_dict())
            logger.debug(f"Saved order flow for {flow.symbol}")
        except Exception as e:
            logger.error(f"Error saving order flow: {e}")
    
    def get_latest_volume_profile(self, symbol: str, exchange: str) -> Optional[Dict[str, Any]]:
        """Get latest volume profile"""
        return self.volume_profiles.find_one(
            {"symbol": symbol, "exchange": exchange},
            sort=[("timestamp", -1)]
        )
    
    def get_latest_order_flow(self, symbol: str, exchange: str) -> Optional[Dict[str, Any]]:
        """Get latest order flow"""
        return self.order_flows.find_one(
            {"symbol": symbol, "exchange": exchange},
            sort=[("timestamp", -1)]
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return {
            "trades_count": self.trades.count_documents({}),
            "volume_profiles_count": self.volume_profiles.count_documents({}),
            "order_flows_count": self.order_flows.count_documents({}),
            "db_stats": self.db.command("dbStats")
        }
    
    def cleanup_old_data(self):
        """Manual cleanup of old data (backup to TTL indexes)"""
        try:
            # Clean trades older than retention
            trades_cutoff = datetime.utcnow() - timedelta(seconds=TRADES_RETENTION)
            trades_result = self.trades.delete_many({"timestamp": {"$lt": trades_cutoff}})
            
            # Clean indicators older than retention
            indicators_cutoff = datetime.utcnow() - timedelta(seconds=INDICATORS_RETENTION)
            vp_result = self.volume_profiles.delete_many({"timestamp": {"$lt": indicators_cutoff}})
            of_result = self.order_flows.delete_many({"timestamp": {"$lt": indicators_cutoff}})
            
            logger.info(f"Cleanup: deleted {trades_result.deleted_count} trades, "
                       f"{vp_result.deleted_count} volume profiles, "
                       f"{of_result.deleted_count} order flows")
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")
    
    def close(self):
        """Close connection"""
        self.client.close()
