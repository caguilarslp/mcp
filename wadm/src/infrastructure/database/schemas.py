"""
MongoDB collection schemas and index definitions for WADM.

This module defines the complete schema structure for all MongoDB collections,
including indexes for performance optimization and TTL for automatic data cleanup.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING
from pymongo.errors import OperationFailure

logger = structlog.get_logger()


class MongoSchemas:
    """MongoDB schema manager for WADM collections."""
    
    # TTL settings (Time To Live for automatic cleanup)
    TTL_RAW_DATA = 3600  # 1 hour for raw trades/orderbook
    TTL_AGGREGATED_1M = 86400  # 24 hours for 1-minute aggregated data
    TTL_AGGREGATED_1H = 604800  # 7 days for 1-hour aggregated data
    TTL_INDICATORS = 2592000  # 30 days for volume profile/order flow
    
    @staticmethod
    async def create_all_schemas(db: AsyncIOMotorDatabase) -> None:
        """Create all collections with schemas and indexes."""
        try:
            await MongoSchemas._create_trades_schema(db)
            await MongoSchemas._create_orderbook_schema(db)
            await MongoSchemas._create_klines_schema(db)
            await MongoSchemas._create_volume_profile_schema(db)
            await MongoSchemas._create_order_flow_schema(db)
            await MongoSchemas._create_liquidity_levels_schema(db)
            await MongoSchemas._create_market_structure_schema(db)
            await MongoSchemas._create_collector_stats_schema(db)
            
            logger.info("All MongoDB schemas created successfully")
            
        except Exception as e:
            logger.error("Failed to create MongoDB schemas", error=str(e))
            raise
    
    @staticmethod
    async def _create_trades_schema(db: AsyncIOMotorDatabase) -> None:
        """Create trades collection with optimized indexes."""
        collection = db.trades
        
        # Define indexes for trades collection
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_exchange_timestamp"),
            
            # Time-based queries
            IndexModel([
                ("timestamp", DESCENDING)
            ], name="timestamp_desc"),
            
            # Exchange-specific queries
            IndexModel([
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="exchange_timestamp"),
            
            # Trade ID uniqueness per exchange
            IndexModel([
                ("trade_id", ASCENDING),
                ("exchange", ASCENDING)
            ], name="trade_id_exchange", unique=True),
            
            # Price range queries
            IndexModel([
                ("symbol", ASCENDING),
                ("price", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_price_timestamp"),
            
            # Volume analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("quantity", DESCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_quantity_timestamp"),
            
            # TTL index for automatic cleanup
            IndexModel([
                ("timestamp", ASCENDING)
            ], name="ttl_trades", expireAfterSeconds=MongoSchemas.TTL_RAW_DATA)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Trades collection schema created")
    
    @staticmethod
    async def _create_orderbook_schema(db: AsyncIOMotorDatabase) -> None:
        """Create orderbook collection with optimized indexes."""
        collection = db.orderbook
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_exchange_timestamp"),
            
            # Sequence-based ordering
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("sequence", DESCENDING)
            ], name="symbol_exchange_sequence"),
            
            # Latest snapshot queries
            IndexModel([
                ("symbol", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_timestamp_latest"),
            
            # TTL index
            IndexModel([
                ("timestamp", ASCENDING)
            ], name="ttl_orderbook", expireAfterSeconds=MongoSchemas.TTL_RAW_DATA)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Orderbook collection schema created")
    
    @staticmethod
    async def _create_klines_schema(db: AsyncIOMotorDatabase) -> None:
        """Create klines collection with optimized indexes."""
        collection = db.klines
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("interval", ASCENDING),
                ("open_time", DESCENDING)
            ], name="symbol_exchange_interval_time"),
            
            # Timeframe-specific queries
            IndexModel([
                ("symbol", ASCENDING),
                ("interval", ASCENDING),
                ("open_time", DESCENDING)
            ], name="symbol_interval_time"),
            
            # Uniqueness constraint
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("interval", ASCENDING),
                ("open_time", ASCENDING)
            ], name="kline_uniqueness", unique=True),
            
            # Volume analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("interval", ASCENDING),
                ("volume", DESCENDING)
            ], name="symbol_interval_volume"),
            
            # TTL index (different TTL based on interval via application logic)
            IndexModel([
                ("close_time", ASCENDING)
            ], name="ttl_klines", expireAfterSeconds=MongoSchemas.TTL_AGGREGATED_1H)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Klines collection schema created")
    
    @staticmethod
    async def _create_volume_profile_schema(db: AsyncIOMotorDatabase) -> None:
        """Create volume_profiles collection with optimized indexes."""
        collection = db.volume_profiles
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("start_time", DESCENDING)
            ], name="symbol_exchange_start_time"),
            
            # Timeframe queries
            IndexModel([
                ("symbol", ASCENDING),
                ("timeframe", ASCENDING),
                ("start_time", DESCENDING)
            ], name="symbol_timeframe_time"),
            
            # POC price queries
            IndexModel([
                ("symbol", ASCENDING),
                ("poc_price", ASCENDING),
                ("start_time", DESCENDING)
            ], name="symbol_poc_time"),
            
            # Value area queries
            IndexModel([
                ("symbol", ASCENDING),
                ("vah_price", DESCENDING),
                ("val_price", ASCENDING)
            ], name="symbol_value_area"),
            
            # Uniqueness constraint
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("timeframe", ASCENDING),
                ("start_time", ASCENDING)
            ], name="volume_profile_uniqueness", unique=True),
            
            # TTL index
            IndexModel([
                ("end_time", ASCENDING)
            ], name="ttl_volume_profiles", expireAfterSeconds=MongoSchemas.TTL_INDICATORS)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Volume profiles collection schema created")
    
    @staticmethod
    async def _create_order_flow_schema(db: AsyncIOMotorDatabase) -> None:
        """Create order_flow collection with optimized indexes."""
        collection = db.order_flow
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_exchange_timestamp"),
            
            # Timeframe queries
            IndexModel([
                ("symbol", ASCENDING),
                ("timeframe", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_timeframe_timestamp"),
            
            # Delta analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("delta", DESCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_delta_timestamp"),
            
            # Cumulative delta analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("cumulative_delta", DESCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_cumulative_delta_timestamp"),
            
            # Imbalance analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("imbalance_ratio", DESCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_imbalance_timestamp"),
            
            # Large trades detection
            IndexModel([
                ("symbol", ASCENDING),
                ("large_trades_count", DESCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_large_trades_timestamp"),
            
            # TTL index
            IndexModel([
                ("timestamp", ASCENDING)
            ], name="ttl_order_flow", expireAfterSeconds=MongoSchemas.TTL_INDICATORS)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Order flow collection schema created")
    
    @staticmethod
    async def _create_liquidity_levels_schema(db: AsyncIOMotorDatabase) -> None:
        """Create liquidity_levels collection with optimized indexes."""
        collection = db.liquidity_levels
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("price", ASCENDING)
            ], name="symbol_exchange_price"),
            
            # Liquidity type queries
            IndexModel([
                ("symbol", ASCENDING),
                ("liquidity_type", ASCENDING),
                ("strength", DESCENDING)
            ], name="symbol_type_strength"),
            
            # Strength-based queries
            IndexModel([
                ("symbol", ASCENDING),
                ("strength", DESCENDING),
                ("last_touch", DESCENDING)
            ], name="symbol_strength_last_touch"),
            
            # Volume-based queries
            IndexModel([
                ("symbol", ASCENDING),
                ("volume", DESCENDING),
                ("price", ASCENDING)
            ], name="symbol_volume_price"),
            
            # Active levels (recent touches)
            IndexModel([
                ("symbol", ASCENDING),
                ("last_touch", DESCENDING),
                ("strength", DESCENDING)
            ], name="symbol_recent_strength"),
            
            # TTL index
            IndexModel([
                ("created_at", ASCENDING)
            ], name="ttl_liquidity_levels", expireAfterSeconds=MongoSchemas.TTL_INDICATORS)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Liquidity levels collection schema created")
    
    @staticmethod
    async def _create_market_structure_schema(db: AsyncIOMotorDatabase) -> None:
        """Create market_structure collection with optimized indexes."""
        collection = db.market_structure
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("symbol", ASCENDING),
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_exchange_timestamp"),
            
            # Timeframe queries
            IndexModel([
                ("symbol", ASCENDING),
                ("timeframe", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_timeframe_timestamp"),
            
            # Trend analysis
            IndexModel([
                ("symbol", ASCENDING),
                ("trend", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_trend_timestamp"),
            
            # Latest analysis per symbol/timeframe
            IndexModel([
                ("symbol", ASCENDING),
                ("timeframe", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbol_timeframe_latest", unique=True),
            
            # TTL index
            IndexModel([
                ("timestamp", ASCENDING)
            ], name="ttl_market_structure", expireAfterSeconds=MongoSchemas.TTL_INDICATORS)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Market structure collection schema created")
    
    @staticmethod
    async def _create_collector_stats_schema(db: AsyncIOMotorDatabase) -> None:
        """Create collector_stats collection for monitoring."""
        collection = db.collector_stats
        
        indexes = [
            # Primary query patterns
            IndexModel([
                ("collector_id", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="collector_timestamp"),
            
            # Exchange monitoring
            IndexModel([
                ("exchange", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="exchange_timestamp"),
            
            # Symbol monitoring
            IndexModel([
                ("symbols", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="symbols_timestamp"),
            
            # Status monitoring
            IndexModel([
                ("status", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="status_timestamp"),
            
            # TTL index (keep stats for 7 days)
            IndexModel([
                ("timestamp", ASCENDING)
            ], name="ttl_collector_stats", expireAfterSeconds=604800)
        ]
        
        await collection.create_indexes(indexes)
        logger.info("Collector stats collection schema created")
    
    @staticmethod
    async def get_collection_info(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Get information about all collections and their indexes."""
        collections_info = {}
        
        try:
            collection_names = await db.list_collection_names()
            
            for name in collection_names:
                collection = db[name]
                
                # Get collection stats
                try:
                    stats = await db.command("collStats", name)
                    index_info = await collection.index_information()
                    
                    collections_info[name] = {
                        "document_count": stats.get("count", 0),
                        "size_bytes": stats.get("size", 0),
                        "avg_doc_size": stats.get("avgObjSize", 0),
                        "index_count": len(index_info),
                        "indexes": list(index_info.keys()),
                        "total_index_size": stats.get("totalIndexSize", 0)
                    }
                except OperationFailure:
                    # Collection might not exist yet
                    collections_info[name] = {"status": "not_found"}
            
            return collections_info
            
        except Exception as e:
            logger.error("Failed to get collection info", error=str(e))
            return {}
    
    @staticmethod
    async def optimize_collections(db: AsyncIOMotorDatabase) -> None:
        """Optimize collections by running maintenance commands."""
        try:
            collection_names = await db.list_collection_names()
            
            for name in collection_names:
                # Compact collection to reclaim space
                try:
                    await db.command("compact", name, force=True)
                    logger.info(f"Compacted collection: {name}")
                except OperationFailure as e:
                    # Compact might not be available in all MongoDB versions
                    logger.warning(f"Could not compact {name}: {str(e)}")
            
            logger.info("Collection optimization completed")
            
        except Exception as e:
            logger.error("Failed to optimize collections", error=str(e))
            raise


# Schema validation rules for MongoDB
TRADE_SCHEMA = {
    "bsonType": "object",
    "required": ["trade_id", "symbol", "exchange", "price", "quantity", "side", "timestamp"],
    "properties": {
        "trade_id": {"bsonType": "string"},
        "symbol": {"bsonType": "string"},
        "exchange": {"bsonType": "string"},
        "price": {"bsonType": "decimal"},
        "quantity": {"bsonType": "decimal"},
        "side": {"enum": ["buy", "sell"]},
        "timestamp": {"bsonType": "date"},
        "is_buyer_maker": {"bsonType": "bool"}
    }
}

ORDERBOOK_SCHEMA = {
    "bsonType": "object",
    "required": ["symbol", "exchange", "timestamp", "bids", "asks"],
    "properties": {
        "symbol": {"bsonType": "string"},
        "exchange": {"bsonType": "string"},
        "timestamp": {"bsonType": "date"},
        "sequence": {"bsonType": "int"},
        "bids": {
            "bsonType": "array",
            "items": {
                "bsonType": "object",
                "required": ["price", "quantity"],
                "properties": {
                    "price": {"bsonType": "decimal"},
                    "quantity": {"bsonType": "decimal"}
                }
            }
        },
        "asks": {
            "bsonType": "array",
            "items": {
                "bsonType": "object",
                "required": ["price", "quantity"],
                "properties": {
                    "price": {"bsonType": "decimal"},
                    "quantity": {"bsonType": "decimal"}
                }
            }
        }
    }
}

VOLUME_PROFILE_SCHEMA = {
    "bsonType": "object",
    "required": ["symbol", "exchange", "start_time", "end_time", "poc_price", "vah_price", "val_price"],
    "properties": {
        "symbol": {"bsonType": "string"},
        "exchange": {"bsonType": "string"},
        "timeframe": {"bsonType": "string"},
        "start_time": {"bsonType": "date"},
        "end_time": {"bsonType": "date"},
        "poc_price": {"bsonType": "decimal"},
        "vah_price": {"bsonType": "decimal"},
        "val_price": {"bsonType": "decimal"},
        "total_volume": {"bsonType": "decimal"},
        "value_area_volume": {"bsonType": "decimal"},
        "price_levels": {"bsonType": "object"}
    }
}

ORDER_FLOW_SCHEMA = {
    "bsonType": "object",
    "required": ["symbol", "exchange", "timestamp", "timeframe", "delta", "cumulative_delta"],
    "properties": {
        "symbol": {"bsonType": "string"},
        "exchange": {"bsonType": "string"},
        "timestamp": {"bsonType": "date"},
        "timeframe": {"bsonType": "string"},
        "delta": {"bsonType": "decimal"},
        "cumulative_delta": {"bsonType": "decimal"},
        "buy_volume": {"bsonType": "decimal"},
        "sell_volume": {"bsonType": "decimal"},
        "total_volume": {"bsonType": "decimal"},
        "imbalance_ratio": {"bsonType": "decimal"},
        "large_trades_count": {"bsonType": "int"},
        "absorption_events": {"bsonType": "int"}
    }
}
