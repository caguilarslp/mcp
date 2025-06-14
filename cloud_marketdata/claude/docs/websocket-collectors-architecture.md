# WebSocket Collectors Architecture - TASK-002A Documentation

## Overview

This document describes the WebSocket collectors architecture implemented in TASK-002A, providing a robust foundation for real-time market data collection from multiple exchanges.

## Architecture Design

### Template Pattern Implementation

The system uses the Template Method design pattern with an abstract base class `WebSocketCollector` that defines the skeleton of the WebSocket connection lifecycle:

```python
WebSocketCollector (Abstract)
    ├── start()
    ├── stop() 
    ├── _run() [Template Method]
    │   ├── _connect_and_run()
    │   │   ├── connect to WebSocket
    │   │   ├── on_connected() [Hook]
    │   │   ├── _subscribe()
    │   │   │   └── create_subscription_message() [Abstract]
    │   │   ├── on_subscribed() [Hook]
    │   │   └── _message_loop()
    │   │       └── process_message() [Abstract]
    │   └── _handle_reconnection()
    └── Properties: status, stats, is_healthy
```

### Core Components

#### 1. WebSocketCollector Base Class (`src/collectors/base.py`)

**Key Features:**
- Async/await throughout for non-blocking I/O
- Automatic reconnection with exponential backoff
- Health monitoring and status tracking
- Statistics collection (messages received, processed, errors)
- Graceful shutdown support

**Lifecycle States:**
```
STOPPED → CONNECTING → CONNECTED → SUBSCRIBING → ACTIVE
           ↓                                        ↓
           ←─────── RECONNECTING ←─────────────────┘
                         ↓
                      ERROR (after max attempts)
```

#### 2. Trade Entity Model (`src/entities/trade.py`)

Pydantic v2 model with automatic validation:

```python
class Trade(BaseModel):
    symbol: str              # Trading pair (e.g., BTCUSDT)
    side: TradeSide         # BUY or SELL enum
    price: Decimal          # Price with arbitrary precision
    quantity: Decimal       # Trade volume
    timestamp: datetime     # Trade execution time
    exchange: str          # Exchange name
    trade_id: str          # Unique identifier
    raw_data: Dict[str, Any]  # Original message for debugging
```

**Validators:**
- Symbol format validation (uppercase, valid pairs)
- Price and quantity must be positive
- Timestamp format standardization
- Automatic type conversion and validation

#### 3. BybitTradesCollector (`src/collectors/bybit/trades.py`)

Concrete implementation for Bybit WebSocket v5 API:

**Connection Details:**
- URL: `wss://stream.bybit.com/v5/public/spot`
- Topics: `publicTrade.{symbol}` format
- Message parsing for Bybit-specific format

**Features:**
- Handles subscription confirmations
- Parses trade arrays from snapshots
- Converts Bybit format to standard Trade entity
- Maintains raw data for debugging

#### 4. InMemoryStorage (`src/collectors/storage/memory.py`)

Thread-safe storage implementation for testing:

**Features:**
- Circular buffer per symbol (deque with maxlen)
- Global trade limit with automatic cleanup
- Thread-safe operations with Lock
- Statistics tracking (trades/sec, symbols, uptime)
- Query methods for retrieving recent trades

**Capacity Management:**
```python
max_trades_per_symbol = 1000  # Per symbol limit
max_total_trades = 10000      # Global limit
retention_minutes = 60        # Time-based cleanup
```

#### 5. CollectorManager (`src/collectors/manager.py`)

Centralized management of multiple collectors:

**Responsibilities:**
- Lifecycle management (start/stop all collectors)
- Health monitoring with background task
- Status aggregation and reporting
- Integration with FastAPI lifespan
- Storage handler coordination

### FastAPI Integration

#### New Endpoints

1. **Collector Status**
   - `GET /collectors/status` - All collectors status
   - `GET /collectors/status/{name}` - Specific collector status

2. **Storage Operations**
   - `GET /collectors/storage/stats` - Storage statistics
   - `GET /collectors/trades?symbol=X&limit=Y` - Recent trades

3. **Debug Endpoints**
   - `GET /debug/tasks` - AsyncIO tasks inspection
   - `GET /debug/storage` - Storage internals

#### Lifespan Integration

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await collector_manager.start()
    yield
    # Shutdown
    await collector_manager.stop()
```

## Error Handling and Resilience

### Reconnection Strategy

Exponential backoff with configurable parameters:
```python
reconnect_delay = min(
    base_delay * (2 ** (attempt - 1)),
    max_delay
)
```

Default configuration:
- Base delay: 1 second
- Max delay: 30 seconds
- Max attempts: 10

### Circuit Breaker Pattern

After max reconnection attempts, collector enters ERROR state and stops attempting connections.

### Health Checks

Multi-level health monitoring:
1. **Application level**: Overall health endpoint
2. **Collector level**: Individual collector status
3. **Connection level**: WebSocket connection state
4. **Data flow level**: Last message timestamp check

## Performance Considerations

### Async Processing

All I/O operations are async:
- WebSocket operations use `websockets` library
- Storage operations are async-ready
- No blocking calls in message processing

### Memory Management

- Circular buffers prevent unlimited growth
- Automatic cleanup of old trades
- Configurable retention policies

### Message Processing

- JSON parsing with error handling
- Minimal processing in hot path
- Debug logging only for first few messages

## Testing and Debugging

### Test Scripts

1. **test_websocket.py** - Direct WebSocket connection test
2. **diagnose_system.sh** - Complete system diagnosis
3. **Debug endpoints** - Runtime inspection

### Logging Strategy

- Structured JSON logging with context
- INFO level for important operations
- DEBUG level for detailed tracing
- Error tracking with full exceptions

## Current Issues and Solutions

### Storage Connection Issue

**Problem**: Trades are received but not stored
**Investigation**:
- WebSocket connects and receives messages ✅
- Collector processes messages correctly ✅
- Storage handler may not be connected ❓

**Debug Steps**:
1. Check `/debug/storage` endpoint
2. Verify storage handler reference in collector
3. Review threading/async compatibility
4. Check logs for storage operations

## Future Enhancements

### TASK-002B Plans
- Add OrderBook entity and collector
- Implement Binance collectors
- Add rate limiting
- Enhance error handling

### Production Hardening (TASK-002C)
- Advanced circuit breaker
- Metrics export (Prometheus)
- Performance optimization
- Resource limits

## Code Examples

### Creating a New Collector

```python
class BinanceTradesCollector(WebSocketCollector):
    WEBSOCKET_URL = "wss://stream.binance.com:9443/ws"
    
    async def create_subscription_message(self, symbols: List[str]) -> str:
        streams = [f"{symbol.lower()}@trade" for symbol in symbols]
        return json.dumps({
            "method": "SUBSCRIBE",
            "params": streams,
            "id": 1
        })
    
    async def process_message(self, message: Dict[str, Any]) -> None:
        # Parse Binance format and store trades
        pass
```

### Using the System

```python
# Initialize
manager = CollectorManager()
await manager.start()

# Get recent trades
trades = await manager.get_recent_trades(symbol="BTCUSDT", limit=10)

# Check status
status = manager.get_collector_status("bybit_trades")
```

## Conclusion

TASK-002A successfully implements a robust, extensible WebSocket collector system with:
- ✅ Clean architecture with Template pattern
- ✅ Type-safe entities with Pydantic
- ✅ Resilient connection handling
- ✅ Comprehensive monitoring
- ✅ Production-ready patterns

The storage connection issue is under investigation but the core WebSocket infrastructure is solid and ready for expansion.
