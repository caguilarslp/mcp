"""
Collector Manager for coordinating multiple WebSocket collectors.
"""

import asyncio
from typing import Dict, List, Optional, Callable, Any, Set
from datetime import datetime, timezone
import structlog

from .base import BaseWebSocketCollector
from .bybit_collector import BybitCollector
from .binance_collector import BinanceCollector
from core.entities import Trade, OrderBook, Kline
from core.types import Symbol, ExchangeName, CollectorStatus

logger = structlog.get_logger(__name__)


class CollectorManager:
    """
    Manages multiple WebSocket collectors across different exchanges.
    
    Provides:
    - Centralized management of all collectors
    - Unified data callbacks
    - Health monitoring and auto-restart
    - Load balancing across connections
    - Statistics aggregation
    """
    
    def __init__(
        self,
        on_trade: Optional[Callable[[Trade], None]] = None,
        on_orderbook: Optional[Callable[[OrderBook], None]] = None,
        on_kline: Optional[Callable[[Kline], None]] = None,
        auto_restart: bool = True,
        restart_delay: float = 30.0,
    ):
        self.on_trade = on_trade
        self.on_orderbook = on_orderbook
        self.on_kline = on_kline
        self.auto_restart = auto_restart
        self.restart_delay = restart_delay
        
        # Collector management
        self.collectors: Dict[str, BaseWebSocketCollector] = {}
        self.collector_tasks: Dict[str, asyncio.Task] = {}
        self.collector_status: Dict[str, CollectorStatus] = {}
        
        # Symbol distribution
        self.symbol_assignments: Dict[str, Set[Symbol]] = {}
        
        # Health monitoring
        self.health_check_task: Optional[asyncio.Task] = None
        self.health_check_interval = 30.0  # seconds
        
        # Statistics
        self.stats = {
            "total_collectors": 0,
            "running_collectors": 0,
            "total_symbols": 0,
            "start_time": None,
            "last_health_check": None,
        }
        
        self.logger = logger.bind(component="CollectorManager")
    
    async def add_exchange(
        self,
        exchange: ExchangeName,
        symbols: List[Symbol],
        **collector_kwargs
    ) -> str:
        """
        Add an exchange with symbols to monitor.
        
        Returns:
            collector_id: Unique identifier for the collector
        """
        collector_id = f"{exchange}_{len(self.collectors)}"
        
        # Create appropriate collector
        if exchange == ExchangeName.BYBIT:
            collector = BybitCollector(
                symbols=symbols,
                on_trade=self._wrap_trade_callback(collector_id),
                on_orderbook=self._wrap_orderbook_callback(collector_id),
                on_kline=self._wrap_kline_callback(collector_id),
                **collector_kwargs
            )
        elif exchange == ExchangeName.BINANCE:
            collector = BinanceCollector(
                symbols=symbols,
                on_trade=self._wrap_trade_callback(collector_id),
                on_orderbook=self._wrap_orderbook_callback(collector_id),
                on_kline=self._wrap_kline_callback(collector_id),
                **collector_kwargs
            )
        else:
            raise ValueError(f"Unsupported exchange: {exchange}")
        
        self.collectors[collector_id] = collector
        self.collector_status[collector_id] = CollectorStatus.STOPPED
        self.symbol_assignments[collector_id] = set(symbols)
        
        self.stats["total_collectors"] = len(self.collectors)
        self.stats["total_symbols"] = sum(len(symbols) for symbols in self.symbol_assignments.values())
        
        self.logger.info(
            "Added exchange collector",
            collector_id=collector_id,
            exchange=exchange,
            symbols=symbols,
            total_collectors=self.stats["total_collectors"]
        )
        
        return collector_id
    
    async def start_all(self) -> None:
        """Start all collectors."""
        if not self.collectors:
            self.logger.warning("No collectors configured")
            return
        
        self.stats["start_time"] = datetime.now(timezone.utc)
        
        # Start all collectors
        for collector_id in self.collectors:
            await self.start_collector(collector_id)
        
        # Start health monitoring
        if self.auto_restart and not self.health_check_task:
            self.health_check_task = asyncio.create_task(self._health_monitor())
        
        self.logger.info(
            "All collectors started",
            total_collectors=len(self.collectors),
            running_collectors=self.stats["running_collectors"]
        )
    
    async def start_collector(self, collector_id: str) -> None:
        """Start a specific collector."""
        if collector_id not in self.collectors:
            raise ValueError(f"Collector {collector_id} not found")
        
        if collector_id in self.collector_tasks:
            self.logger.warning("Collector already running", collector_id=collector_id)
            return
        
        collector = self.collectors[collector_id]
        self.collector_status[collector_id] = CollectorStatus.STARTING
        
        # Start collector in background task
        task = asyncio.create_task(self._run_collector(collector_id, collector))
        self.collector_tasks[collector_id] = task
        
        self.logger.info("Started collector", collector_id=collector_id)
    
    async def stop_all(self) -> None:
        """Stop all collectors gracefully."""
        self.logger.info("Stopping all collectors")
        
        # Stop health monitoring
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
            self.health_check_task = None
        
        # Stop all collectors
        stop_tasks = []
        for collector_id in list(self.collector_tasks.keys()):
            stop_tasks.append(self.stop_collector(collector_id))
        
        if stop_tasks:
            await asyncio.gather(*stop_tasks, return_exceptions=True)
        
        self.logger.info("All collectors stopped")
    
    async def stop_collector(self, collector_id: str) -> None:
        """Stop a specific collector."""
        if collector_id not in self.collector_tasks:
            return
        
        collector = self.collectors[collector_id]
        task = self.collector_tasks[collector_id]
        
        self.logger.info("Stopping collector", collector_id=collector_id)
        
        # Stop the collector
        await collector.stop()
        
        # Cancel the task
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        # Cleanup
        del self.collector_tasks[collector_id]
        self.collector_status[collector_id] = CollectorStatus.STOPPED
        self.stats["running_collectors"] = len(self.collector_tasks)
        
        self.logger.info("Collector stopped", collector_id=collector_id)
    
    async def add_symbol_to_exchange(self, exchange: ExchangeName, symbol: Symbol) -> None:
        """Add a symbol to all collectors for a specific exchange."""
        for collector_id, collector in self.collectors.items():
            if collector.exchange == exchange:
                await collector.add_symbol(symbol)
                self.symbol_assignments[collector_id].add(symbol)
        
        self.stats["total_symbols"] = sum(len(symbols) for symbols in self.symbol_assignments.values())
    
    async def remove_symbol_from_exchange(self, exchange: ExchangeName, symbol: Symbol) -> None:
        """Remove a symbol from all collectors for a specific exchange."""
        for collector_id, collector in self.collectors.items():
            if collector.exchange == exchange:
                await collector.remove_symbol(symbol)
                self.symbol_assignments[collector_id].discard(symbol)
        
        self.stats["total_symbols"] = sum(len(symbols) for symbols in self.symbol_assignments.values())
    
    def get_collector_stats(self, collector_id: str) -> Optional[Dict[str, Any]]:
        """Get statistics for a specific collector."""
        if collector_id not in self.collectors:
            return None
        
        collector = self.collectors[collector_id]
        base_stats = collector.get_stats()
        
        return {
            **base_stats,
            "collector_id": collector_id,
            "status": self.collector_status[collector_id],
            "assigned_symbols": list(self.symbol_assignments[collector_id])
        }
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics for all collectors."""
        collector_stats = {}
        total_messages = 0
        total_errors = 0
        
        for collector_id in self.collectors:
            stats = self.get_collector_stats(collector_id)
            if stats:
                collector_stats[collector_id] = stats
                total_messages += stats.get("messages_received", 0)
                total_errors += stats.get("errors", 0)
        
        return {
            "manager_stats": {
                **self.stats,
                "running_collectors": len(self.collector_tasks),
                "total_messages": total_messages,
                "total_errors": total_errors,
                "error_rate": total_errors / total_messages if total_messages > 0 else 0,
            },
            "collectors": collector_stats
        }
    
    def _wrap_trade_callback(self, collector_id: str) -> Callable[[Trade], None]:
        """Wrap trade callback with collector identification."""
        async def wrapped_callback(trade: Trade):
            if self.on_trade:
                try:
                    if asyncio.iscoroutinefunction(self.on_trade):
                        await self.on_trade(trade)
                    else:
                        self.on_trade(trade)
                except Exception as e:
                    self.logger.error(
                        "Error in trade callback", 
                        collector_id=collector_id, 
                        error=str(e)
                    )
        return wrapped_callback
    
    def _wrap_orderbook_callback(self, collector_id: str) -> Callable[[OrderBook], None]:
        """Wrap orderbook callback with collector identification."""
        async def wrapped_callback(orderbook: OrderBook):
            if self.on_orderbook:
                try:
                    if asyncio.iscoroutinefunction(self.on_orderbook):
                        await self.on_orderbook(orderbook)
                    else:
                        self.on_orderbook(orderbook)
                except Exception as e:
                    self.logger.error(
                        "Error in orderbook callback", 
                        collector_id=collector_id, 
                        error=str(e)
                    )
        return wrapped_callback
    
    def _wrap_kline_callback(self, collector_id: str) -> Callable[[Kline], None]:
        """Wrap kline callback with collector identification."""
        async def wrapped_callback(kline: Kline):
            if self.on_kline:
                try:
                    if asyncio.iscoroutinefunction(self.on_kline):
                        await self.on_kline(kline)
                    else:
                        self.on_kline(kline)
                except Exception as e:
                    self.logger.error(
                        "Error in kline callback", 
                        collector_id=collector_id, 
                        error=str(e)
                    )
        return wrapped_callback
    
    async def _run_collector(self, collector_id: str, collector: BaseWebSocketCollector) -> None:
        """Run a collector and handle its lifecycle."""
        try:
            self.collector_status[collector_id] = CollectorStatus.RUNNING
            self.stats["running_collectors"] = len(self.collector_tasks)
            
            await collector.start()
            
        except asyncio.CancelledError:
            self.logger.info("Collector task cancelled", collector_id=collector_id)
        except Exception as e:
            self.logger.error(
                "Collector error", 
                collector_id=collector_id, 
                error=str(e)
            )
            self.collector_status[collector_id] = CollectorStatus.ERROR
            
            # Auto-restart if enabled
            if self.auto_restart and collector_id in self.collector_tasks:
                self.logger.info(
                    "Scheduling collector restart",
                    collector_id=collector_id,
                    delay=self.restart_delay
                )
                await asyncio.sleep(self.restart_delay)
                
                if collector_id in self.collectors:  # Still exists
                    # Remove failed task
                    del self.collector_tasks[collector_id]
                    # Restart
                    await self.start_collector(collector_id)
        
        finally:
            # Clean up if task completed naturally
            if collector_id in self.collector_tasks:
                del self.collector_tasks[collector_id]
            self.collector_status[collector_id] = CollectorStatus.STOPPED
            self.stats["running_collectors"] = len(self.collector_tasks)
    
    async def _health_monitor(self) -> None:
        """Monitor health of all collectors and restart if needed."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                current_time = datetime.now(timezone.utc)
                self.stats["last_health_check"] = current_time
                
                for collector_id, collector in self.collectors.items():
                    if collector_id not in self.collector_tasks:
                        continue
                    
                    # Check if collector is still receiving data
                    collector_stats = collector.get_stats()
                    last_message_time = collector_stats.get("last_message_time")
                    
                    if last_message_time:
                        time_since_last_message = (current_time - last_message_time).total_seconds()
                        
                        # If no messages for 5 minutes, consider unhealthy
                        if time_since_last_message > 300:
                            self.logger.warning(
                                "Collector appears unhealthy - no recent messages",
                                collector_id=collector_id,
                                last_message_time=last_message_time,
                                time_since_last=time_since_last_message
                            )
                            
                            # Restart collector
                            await self.stop_collector(collector_id)
                            await asyncio.sleep(5)
                            await self.start_collector(collector_id)
                
                self.logger.debug(
                    "Health check completed",
                    running_collectors=len(self.collector_tasks),
                    total_collectors=len(self.collectors)
                )
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error("Error in health monitor", error=str(e))
                await asyncio.sleep(30)  # Wait before retrying
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup."""
        await self.stop_all()
