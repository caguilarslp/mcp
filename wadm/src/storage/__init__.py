"""
Simple MongoDB storage manager
"""
from datetime import datetime, timedelta, timezone
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
        self.smc_analyses = self.db.smc_analyses
        
        # Create indexes
        self._create_indexes()
        
        logger.info("Storage manager initialized")
    
    def _create_indexes(self):
        """Create necessary indexes with error handling"""
        try:
            # Trades indexes - basic indexing without TTL for now
            self.trades.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
            
            # Indicators indexes - basic indexing
            self.volume_profiles.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
            self.order_flows.create_index([("symbol", 1), ("exchange", 1), ("timestamp", -1)])
            
            # SMC indexes
            self.smc_analyses.create_index([("symbol", 1), ("timestamp", -1)])
            
            logger.info("Basic indexes created successfully")
            
            # Create TTL indexes with proper error handling
            try:
                # Only create TTL if not time-series collections
                self.trades.create_index([("timestamp", 1)], expireAfterSeconds=TRADES_RETENTION)
                self.volume_profiles.create_index([("timestamp", 1)], expireAfterSeconds=INDICATORS_RETENTION)
                self.order_flows.create_index([("timestamp", 1)], expireAfterSeconds=INDICATORS_RETENTION)
                self.smc_analyses.create_index([("timestamp", 1)], expireAfterSeconds=INDICATORS_RETENTION)
                logger.info("TTL indexes created successfully")
            except Exception as ttl_error:
                # TTL indexes might fail on time-series collections, use manual cleanup instead
                if "TTL indexes on time-series collections" in str(ttl_error):
                    logger.info("TTL indexes not supported on time-series collections, using manual cleanup")
                else:
                    logger.warning(f"TTL indexes failed (will use manual cleanup): {ttl_error}")
                
        except Exception as e:
            logger.warning(f"Index creation failed: {e}. Continuing without indexes.")
    
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
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        
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
            "db_stats": self.db.command("dbStats"),
            "smc_analyses_count": self.smc_analyses.count_documents({})
        }
    
    def cleanup_old_data(self):
        """Manual cleanup of old data (backup to TTL indexes)"""
        try:
            # Clean trades older than retention
            trades_cutoff = datetime.now(timezone.utc) - timedelta(seconds=TRADES_RETENTION)
            trades_result = self.trades.delete_many({"timestamp": {"$lt": trades_cutoff}})
            
            # Clean indicators older than retention
            indicators_cutoff = datetime.now(timezone.utc) - timedelta(seconds=INDICATORS_RETENTION)
            vp_result = self.volume_profiles.delete_many({"timestamp": {"$lt": indicators_cutoff}})
            of_result = self.order_flows.delete_many({"timestamp": {"$lt": indicators_cutoff}})
            
            logger.info(f"Cleanup: deleted {trades_result.deleted_count} trades, "
                       f"{vp_result.deleted_count} volume profiles, "
                       f"{of_result.deleted_count} order flows")
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")
    
    def save_smc_analysis(self, analysis: Dict[str, Any]):
        """Save SMC analysis"""
        try:
            self.smc_analyses.insert_one(analysis)
            logger.debug(f"Saved SMC analysis for {analysis.get('symbol')}")
        except Exception as e:
            logger.error(f"Error saving SMC analysis: {e}")
    
    def get_latest_smc_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest SMC analysis for a symbol"""
        return self.smc_analyses.find_one(
            {"symbol": symbol},
            sort=[("timestamp", -1)]
        )
    
    def get_smc_analyses(self, symbol: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent SMC analyses"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        cursor = self.smc_analyses.find({
            "symbol": symbol,
            "timestamp": {"$gte": since}
        }).sort("timestamp", -1)
        return list(cursor)
    
    def close(self):
        """Close connection"""
        self.client.close()
