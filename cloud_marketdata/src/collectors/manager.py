"""
Collector Manager

Gestiona múltiples collectors de WebSocket, su inicialización,
monitoreo y integración con FastAPI.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from src.collectors.base import WebSocketCollector, CollectorStatus
from src.collectors.bybit import BybitTradesCollector
from src.collectors.storage import InMemoryStorage
from src.core.logger import get_logger
from src.core.config import Settings


class CollectorManager:
    """
    Manager para múltiples WebSocket collectors
    
    Maneja inicialización, monitoreo y estado de collectors
    con integración en FastAPI lifecycle.
    """
    
    def __init__(self):
        """Initialize collector manager"""
        self.collectors: Dict[str, WebSocketCollector] = {}
        self.storage = InMemoryStorage()
        self.logger = get_logger("collector_manager")
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        
        self.logger.info("Collector manager initialized")
    
    async def start(self) -> None:
        """Start all collectors"""
        if self._running:
            self.logger.warning("Collector manager already running")
            return
        
        self._running = True
        self.logger.info("Starting collector manager")
        
        # Initialize default collectors
        await self._initialize_default_collectors()
        
        # Start all collectors
        for name, collector in self.collectors.items():
            try:
                self.logger.info(f"Starting collector: {name}...")
                await collector.start()
                self.logger.info(f"Started collector: {name}")
                # Give it a moment to establish connection
                await asyncio.sleep(0.5)
                self.logger.info(f"Collector {name} status: {collector.status.value}")
            except Exception as e:
                self.logger.error(f"Failed to start collector {name}: {e}", exc_info=True)
        
        # Start monitoring task
        self._monitor_task = asyncio.create_task(self._monitor_collectors())
        
        self.logger.info(f"Collector manager started with {len(self.collectors)} collectors")
    
    async def stop(self) -> None:
        """Stop all collectors"""
        if not self._running:
            return
        
        self._running = False
        self.logger.info("Stopping collector manager")
        
        # Stop monitoring
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        # Stop all collectors
        for name, collector in self.collectors.items():
            try:
                await collector.stop()
                self.logger.info(f"Stopped collector: {name}")
            except Exception as e:
                self.logger.error(f"Error stopping collector {name}: {e}")
        
        self.logger.info("Collector manager stopped")
    
    async def _initialize_default_collectors(self) -> None:
        """Initialize default collectors from configuration"""
        # Get symbols from configuration
        settings = Settings()
        symbols = settings.SYMBOLS
        
        if not symbols:
            self.logger.warning("No symbols configured, using default BTCUSDT")
            symbols = ["BTCUSDT"]
        
        # Create Bybit trades collector
        bybit_collector = BybitTradesCollector(
            symbols=symbols,
            storage_handler=self.storage,
            max_reconnect_attempts=10,
            reconnect_delay_base=1.0,
            reconnect_delay_max=30.0
        )
        
        self.collectors["bybit_trades"] = bybit_collector
        self.logger.info(f"Initialized default collectors for symbols: {symbols}")
    
    async def add_collector(self, name: str, collector: WebSocketCollector) -> None:
        """
        Add a collector to the manager
        
        Args:
            name: Collector name
            collector: WebSocketCollector instance
        """
        if name in self.collectors:
            self.logger.warning(f"Collector {name} already exists, replacing")
            await self.collectors[name].stop()
        
        self.collectors[name] = collector
        
        # Start if manager is running
        if self._running:
            await collector.start()
        
        self.logger.info(f"Added collector: {name}")
    
    async def remove_collector(self, name: str) -> bool:
        """
        Remove a collector from the manager
        
        Args:
            name: Collector name
            
        Returns:
            True if collector was removed, False if not found
        """
        if name not in self.collectors:
            return False
        
        collector = self.collectors.pop(name)
        await collector.stop()
        
        self.logger.info(f"Removed collector: {name}")
        return True
    
    def get_collector_status(self, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get status of collectors
        
        Args:
            name: Specific collector name or None for all
            
        Returns:
            Dictionary with collector status information
        """
        if name:
            if name not in self.collectors:
                return {"error": f"Collector {name} not found"}
            
            collector = self.collectors[name]
            return {
                "name": name,
                "status": collector.status.value,
                "is_healthy": collector.is_healthy,
                "stats": collector.stats
            }
        else:
            return {
                "collectors": {
                    name: {
                        "status": collector.status.value,
                        "is_healthy": collector.is_healthy,
                        "stats": collector.stats
                    }
                    for name, collector in self.collectors.items()
                },
                "manager": {
                    "running": self._running,
                    "total_collectors": len(self.collectors),
                    "active_collectors": sum(
                        1 for c in self.collectors.values() 
                        if c.status == CollectorStatus.ACTIVE
                    )
                }
            }
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return await self.storage.get_stats()
    
    async def get_recent_trades(
        self, 
        symbol: Optional[str] = None, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent trades from storage
        
        Args:
            symbol: Specific symbol or None for all
            limit: Maximum number of trades
            
        Returns:
            List of trade dictionaries
        """
        trades = await self.storage.get_recent_trades(symbol=symbol, limit=limit)
        return [trade.to_dict() for trade in trades]
    
    async def _monitor_collectors(self) -> None:
        """Monitor collectors health and log status periodically"""
        while self._running:
            try:
                await asyncio.sleep(60)  # Monitor every minute
                
                if not self._running:
                    break
                
                # Check collector health
                unhealthy_collectors = []
                for name, collector in self.collectors.items():
                    if not collector.is_healthy:
                        unhealthy_collectors.append(name)
                
                if unhealthy_collectors:
                    self.logger.warning(f"Unhealthy collectors: {unhealthy_collectors}")
                else:
                    self.logger.info(f"All {len(self.collectors)} collectors healthy")
                
                # Log basic stats
                storage_stats = await self.storage.get_stats()
                self.logger.info(
                    f"Storage: {storage_stats['current_trades_stored']} trades, "
                    f"{storage_stats['trades_per_second']:.1f} trades/sec"
                )
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in collector monitoring: {e}")


# Global instance
collector_manager = CollectorManager()
