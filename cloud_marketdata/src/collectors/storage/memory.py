"""
In-Memory Storage Handler

Implementación simple de almacenamiento en memoria para testing
y verificación de datos recibidos.
"""

import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from threading import Lock

from src.entities.trade import Trade
from src.core.logger import get_logger


class InMemoryStorage:
    """
    Handler de almacenamiento en memoria para trades
    
    Mantiene trades en memoria con capacidad limitada y funciones
    de consulta para testing y verificación.
    """
    
    def __init__(
        self,
        max_trades_per_symbol: int = 1000,
        max_total_trades: int = 10000,
        retention_minutes: int = 60
    ):
        """
        Initialize in-memory storage
        
        Args:
            max_trades_per_symbol: Maximum trades to keep per symbol
            max_total_trades: Maximum total trades to keep
            retention_minutes: How long to keep trades in minutes
        """
        self.max_trades_per_symbol = max_trades_per_symbol
        self.max_total_trades = max_total_trades
        self.retention_minutes = retention_minutes
        
        # Storage: symbol -> deque of trades
        self._trades: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_trades_per_symbol))
        self._lock = Lock()
        
        # Statistics
        self._stats = {
            "total_trades_received": 0,
            "total_trades_stored": 0,
            "trades_discarded": 0,
            "symbols_tracked": set(),
            "start_time": datetime.now(),
        }
        
        self.logger = get_logger("storage.memory")
        self.logger.info(f"Initialized in-memory storage (max_per_symbol={max_trades_per_symbol}, retention={retention_minutes}m)")
    
    async def store_trade(self, trade: Trade) -> None:
        """
        Store trade in memory
        
        Args:
            trade: Trade entity to store
        """
        with self._lock:
            try:
                # Add to symbol-specific deque
                self._trades[trade.symbol].append(trade)
                
                # Update statistics
                self._stats["total_trades_received"] += 1
                self._stats["total_trades_stored"] += 1
                self._stats["symbols_tracked"].add(trade.symbol)
                
                # Check total limit
                total_trades = sum(len(trades) for trades in self._trades.values())
                if total_trades > self.max_total_trades:
                    await self._cleanup_oldest_trades()
                
                # Log first few trades at INFO level for debugging
                if self._stats["total_trades_received"] <= 5:
                    self.logger.info(f"Stored trade #{self._stats['total_trades_received']}: {trade.symbol} {trade.side} {trade.price}@{trade.quantity}")
                    self.logger.info(f"Total trades for {trade.symbol}: {len(self._trades[trade.symbol])}")
                else:
                    self.logger.debug(f"Stored trade: {trade.symbol} {trade.side} {trade.price}@{trade.quantity}")
                
            except Exception as e:
                self.logger.error(f"Error storing trade: {e}")
                raise
    
    async def get_recent_trades(
        self, 
        symbol: Optional[str] = None, 
        limit: int = 100,
        since: Optional[datetime] = None
    ) -> List[Trade]:
        """
        Get recent trades
        
        Args:
            symbol: Specific symbol or None for all symbols
            limit: Maximum number of trades to return
            since: Only return trades after this timestamp
            
        Returns:
            List of trades sorted by timestamp (newest first)
        """
        with self._lock:
            all_trades = []
            
            if symbol:
                # Get trades for specific symbol
                if symbol in self._trades:
                    all_trades.extend(self._trades[symbol])
            else:
                # Get trades for all symbols
                for symbol_trades in self._trades.values():
                    all_trades.extend(symbol_trades)
            
            # Filter by timestamp if specified
            if since:
                all_trades = [trade for trade in all_trades if trade.timestamp >= since]
            
            # Sort by timestamp (newest first)
            all_trades.sort(key=lambda t: t.timestamp, reverse=True)
            
            # Apply limit
            return all_trades[:limit]
    
    async def get_trades_count(self, symbol: Optional[str] = None) -> int:
        """
        Get number of trades stored
        
        Args:
            symbol: Specific symbol or None for all symbols
            
        Returns:
            Number of trades
        """
        with self._lock:
            if symbol:
                return len(self._trades.get(symbol, deque()))
            else:
                return sum(len(trades) for trades in self._trades.values())
    
    async def get_symbols(self) -> List[str]:
        """
        Get list of symbols being tracked
        
        Returns:
            List of symbol names
        """
        with self._lock:
            return list(self._trades.keys())
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics
        
        Returns:
            Dictionary with storage stats
        """
        with self._lock:
            uptime = datetime.now() - self._stats["start_time"]
            
            return {
                "total_trades_received": self._stats["total_trades_received"],
                "total_trades_stored": self._stats["total_trades_stored"],
                "trades_discarded": self._stats["trades_discarded"],
                "symbols_tracked": list(self._stats["symbols_tracked"]),
                "symbols_count": len(self._trades),
                "current_trades_stored": sum(len(trades) for trades in self._trades.values()),
                "uptime_seconds": uptime.total_seconds(),
                "trades_per_second": (
                    self._stats["total_trades_received"] / uptime.total_seconds() 
                    if uptime.total_seconds() > 0 else 0
                ),
                "memory_usage": {
                    "max_trades_per_symbol": self.max_trades_per_symbol,
                    "max_total_trades": self.max_total_trades,
                    "retention_minutes": self.retention_minutes
                }
            }
    
    async def clear_trades(self, symbol: Optional[str] = None) -> int:
        """
        Clear trades from storage
        
        Args:
            symbol: Specific symbol or None for all symbols
            
        Returns:
            Number of trades cleared
        """
        with self._lock:
            cleared_count = 0
            
            if symbol:
                if symbol in self._trades:
                    cleared_count = len(self._trades[symbol])
                    self._trades[symbol].clear()
            else:
                cleared_count = sum(len(trades) for trades in self._trades.values())
                self._trades.clear()
                self._stats["symbols_tracked"].clear()
            
            self.logger.info(f"Cleared {cleared_count} trades" + (f" for {symbol}" if symbol else ""))
            return cleared_count
    
    async def _cleanup_oldest_trades(self) -> None:
        """Clean up oldest trades to maintain memory limits"""
        # Find symbol with oldest trades
        oldest_symbol = None
        oldest_timestamp = datetime.now()
        
        for symbol, trades in self._trades.items():
            if trades and trades[0].timestamp < oldest_timestamp:
                oldest_timestamp = trades[0].timestamp
                oldest_symbol = symbol
        
        # Remove oldest trades
        if oldest_symbol and self._trades[oldest_symbol]:
            removed_count = min(100, len(self._trades[oldest_symbol]) // 2)  # Remove half or 100, whichever is smaller
            
            for _ in range(removed_count):
                if self._trades[oldest_symbol]:
                    self._trades[oldest_symbol].popleft()
            
            self._stats["trades_discarded"] += removed_count
            self.logger.debug(f"Discarded {removed_count} old trades for {oldest_symbol}")
    
    async def cleanup_old_trades(self) -> int:
        """
        Clean up trades older than retention period
        
        Returns:
            Number of trades cleaned up
        """
        cutoff_time = datetime.now() - timedelta(minutes=self.retention_minutes)
        cleaned_count = 0
        
        with self._lock:
            for symbol in list(self._trades.keys()):
                trades = self._trades[symbol]
                original_count = len(trades)
                
                # Remove old trades from the left (oldest)
                while trades and trades[0].timestamp < cutoff_time:
                    trades.popleft()
                
                removed = original_count - len(trades)
                cleaned_count += removed
                
                # Remove empty symbol entries
                if not trades:
                    del self._trades[symbol]
        
        if cleaned_count > 0:
            self._stats["trades_discarded"] += cleaned_count
            self.logger.info(f"Cleaned up {cleaned_count} old trades")
        
        return cleaned_count
    
    def __len__(self) -> int:
        """Get total number of trades stored"""
        with self._lock:
            return sum(len(trades) for trades in self._trades.values())
    
    def __str__(self) -> str:
        """String representation"""
        with self._lock:
            total_trades = sum(len(trades) for trades in self._trades.values())
            return f"InMemoryStorage(symbols={len(self._trades)}, trades={total_trades})"
