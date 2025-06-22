"""
System Router
Health checks, status, and monitoring endpoints
"""

import psutil
import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.api.routers.auth import verify_api_key
from src.storage.mongo_manager import MongoManager

logger = logging.getLogger(__name__)
router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    uptime_seconds: Optional[float] = None


class SystemMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float


class DatabaseStats(BaseModel):
    connected: bool
    database: str
    collections: Dict[str, int]
    total_documents: int
    storage_size_mb: float


class ExchangeStatus(BaseModel):
    name: str
    connected: bool
    trades_collected: int
    last_trade_time: Optional[datetime]


class SystemStatus(BaseModel):
    health: HealthResponse
    metrics: SystemMetrics
    database: DatabaseStats
    exchanges: List[ExchangeStatus]


# Store startup time
startup_time = datetime.utcnow()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint
    """
    uptime = (datetime.utcnow() - startup_time).total_seconds()
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        uptime_seconds=uptime
    )


@router.get("/metrics", response_model=SystemMetrics)
async def system_metrics(api_key: str = Depends(verify_api_key)):
    """
    Get system resource metrics
    """
    # CPU and Memory
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    # Disk usage
    disk = psutil.disk_usage('/')
    
    return SystemMetrics(
        cpu_percent=cpu_percent,
        memory_percent=memory.percent,
        memory_used_mb=memory.used / 1024 / 1024,
        memory_total_mb=memory.total / 1024 / 1024,
        disk_percent=disk.percent,
        disk_used_gb=disk.used / 1024 / 1024 / 1024,
        disk_total_gb=disk.total / 1024 / 1024 / 1024
    )


@router.get("/database", response_model=DatabaseStats)
async def database_status(api_key: str = Depends(verify_api_key)):
    """
    Get database status and statistics
    """
    mongo = MongoManager()
    
    try:
        # Get collection stats
        collections = {}
        total_docs = 0
        
        for collection_name in ["trades", "volume_profiles", "order_flows", "smc_analyses"]:
            try:
                collection = mongo.db[collection_name]
                count = collection.count_documents({})
                collections[collection_name] = count
                total_docs += count
            except Exception as e:
                logger.error(f"Error getting stats for {collection_name}: {e}")
                collections[collection_name] = -1
        
        # Get database stats
        stats = mongo.db.command("dbstats")
        storage_size_mb = stats.get("storageSize", 0) / 1024 / 1024
        
        return DatabaseStats(
            connected=True,
            database=mongo.config.MONGO_DB,
            collections=collections,
            total_documents=total_docs,
            storage_size_mb=storage_size_mb
        )
    except Exception as e:
        logger.error(f"Database status error: {e}")
        return DatabaseStats(
            connected=False,
            database="error",
            collections={},
            total_documents=0,
            storage_size_mb=0
        )


@router.get("/exchanges", response_model=List[ExchangeStatus])
async def exchange_status(api_key: str = Depends(verify_api_key)):
    """
    Get exchange connection status
    """
    mongo = MongoManager()
    exchanges = ["bybit", "binance", "coinbase", "kraken"]
    status_list = []
    
    for exchange in exchanges:
        try:
            # Get latest trade
            latest_trade = mongo.db.trades.find_one(
                {"exchange": exchange},
                sort=[("timestamp", -1)]
            )
            
            # Count trades
            trade_count = mongo.db.trades.count_documents({"exchange": exchange})
            
            status_list.append(ExchangeStatus(
                name=exchange,
                connected=latest_trade is not None,
                trades_collected=trade_count,
                last_trade_time=latest_trade["timestamp"] if latest_trade else None
            ))
        except Exception as e:
            logger.error(f"Error getting status for {exchange}: {e}")
            status_list.append(ExchangeStatus(
                name=exchange,
                connected=False,
                trades_collected=0,
                last_trade_time=None
            ))
    
    return status_list


@router.get("/status", response_model=SystemStatus)
async def full_status(api_key: str = Depends(verify_api_key)):
    """
    Get complete system status
    """
    health = await health_check()
    metrics = await system_metrics(api_key)
    database = await database_status(api_key)
    exchanges = await exchange_status(api_key)
    
    return SystemStatus(
        health=health,
        metrics=metrics,
        database=database,
        exchanges=exchanges
    )


@router.post("/cache/clear")
async def clear_cache(api_key: str = Depends(verify_api_key)):
    """
    Clear application cache
    TODO: Implement when Redis is added
    """
    return {
        "status": "success",
        "message": "Cache cleared (not implemented yet)"
    }


@router.get("/logs/recent")
async def recent_logs(
    lines: int = 100,
    level: Optional[str] = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Get recent log entries
    TODO: Implement log streaming
    """
    return {
        "message": "Log streaming not implemented yet",
        "lines_requested": lines,
        "level_filter": level
    }
