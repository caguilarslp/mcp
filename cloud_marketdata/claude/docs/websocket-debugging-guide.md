# WebSocket Debugging Guide - TASK-002A

## Quick Diagnosis Commands

### 1. System Health Check
```bash
# Overall health
curl http://localhost:8000/health | python -m json.tool

# Collector specific status
curl http://localhost:8000/collectors/status/bybit_trades | python -m json.tool

# Storage statistics
curl http://localhost:8000/collectors/storage/stats | python -m json.tool

# Recent trades
curl "http://localhost:8000/collectors/trades?limit=5" | python -m json.tool
```

### 2. Debug Endpoints
```bash
# AsyncIO tasks inspection
curl http://localhost:8000/debug/tasks | python -m json.tool

# Storage internals
curl http://localhost:8000/debug/storage | python -m json.tool
```

### 3. Direct WebSocket Test
```bash
# Run test script on host
python test_websocket.py

# Or inside container
docker cp test_websocket.py cloud_marketdata-app-1:/app/
docker exec -it cloud_marketdata-app-1 python test_websocket.py
```

## Common Issues and Solutions

### Issue 1: WebSocket Not Connecting

**Symptoms:**
- Status shows "connecting" or "reconnecting"
- No messages received
- Logs show connection errors

**Solutions:**
1. Check network connectivity:
   ```bash
   docker exec -it cloud_marketdata-app-1 ping -c 3 stream.bybit.com
   ```

2. Verify DNS resolution:
   ```bash
   docker exec -it cloud_marketdata-app-1 nslookup stream.bybit.com
   ```

3. Test with host network:
   ```yaml
   # In docker-compose.yml
   services:
     app:
       network_mode: "host"
   ```

### Issue 2: Trades Not Stored (Current Issue)

**Symptoms:**
- WebSocket connected and receiving messages
- Storage stats show 0 trades
- No trades in `/collectors/trades` endpoint

**Diagnostic Steps:**

1. **Check storage handler connection:**
   ```bash
   curl http://localhost:8000/debug/storage | python -m json.tool | grep "collector_.*_storage"
   ```

2. **Monitor logs for storage operations:**
   ```bash
   docker-compose logs -f app | grep -E "Stored trade|storage|Storage"
   ```

3. **Verify asyncio task is running:**
   ```bash
   curl http://localhost:8000/debug/tasks | python -m json.tool | grep -A 5 "bybit_trades"
   ```

**Potential Fixes:**

1. **Threading issue** - Change from `threading.Lock` to `asyncio.Lock`:
   ```python
   # In memory.py
   import asyncio
   self._lock = asyncio.Lock()
   
   # Then use async with
   async with self._lock:
       # operations
   ```

2. **Storage handler not passed** - Verify in CollectorManager:
   ```python
   # Check that storage is passed to collector
   bybit_collector = BybitTradesCollector(
       symbols=symbols,
       storage_handler=self.storage,  # <- This must be set
   )
   ```

3. **Exception in storage** - Add more error logging:
   ```python
   try:
       await self.storage_handler.store_trade(trade)
   except Exception as e:
       self.logger.error(f"Storage error: {e}", exc_info=True)
   ```

### Issue 3: High CPU Usage

**Symptoms:**
- Container using excessive CPU
- Slow response times
- Many reconnection attempts

**Solutions:**
1. Check for tight loops in logs
2. Increase reconnection delays
3. Add rate limiting to message processing

### Issue 4: Memory Growth

**Symptoms:**
- Container memory increasing over time
- OOM kills
- Slow garbage collection

**Solutions:**
1. Verify storage limits are enforced
2. Check for memory leaks in raw_data storage
3. Enable periodic cleanup task

## Log Analysis

### Key Log Patterns to Watch

**Successful Connection:**
```
INFO - Connecting to WebSocket: wss://stream.bybit.com/v5/public/spot
INFO - WebSocket connection established for bybit_trades
INFO - Connected to Bybit WebSocket API v5
INFO - Successfully subscribed to: publicTrade.BTCUSDT
```

**Message Processing:**
```
INFO - Stored trade #1: BTCUSDT BUY 104569.5@0.019691
INFO - Total trades for BTCUSDT: 1
DEBUG - Processed trade: Trade(symbol='BTCUSDT', ...)
```

**Error Patterns:**
```
ERROR - WebSocket connection error: [Errno 111] Connection refused
WARNING - Collector bybit_trades not active, forcing reconnection
ERROR - Storage error: [specific error message]
```

### Useful Log Filters

```bash
# Connection issues
docker-compose logs app | grep -E "connect|Connect|CONNECTION"

# Storage operations
docker-compose logs app | grep -E "store|Store|STORE|storage|Storage"

# Errors only
docker-compose logs app | grep -E "ERROR|CRITICAL"

# Trade flow
docker-compose logs app | grep -E "trade|Trade|TRADE"
```

## Performance Monitoring

### Real-time Metrics
```bash
# Watch storage stats
watch -n 1 'curl -s http://localhost:8000/collectors/storage/stats | python -m json.tool'

# Monitor collector status
watch -n 2 'curl -s http://localhost:8000/collectors/status | python -m json.tool'

# Track trade count
watch -n 1 'curl -s http://localhost:8000/collectors/trades?limit=1 | python -m json.tool | grep count'
```

### Container Resources
```bash
# CPU and memory usage
docker stats cloud_marketdata-app-1

# Detailed container inspection
docker inspect cloud_marketdata-app-1 | grep -A 10 "State"
```

## Testing Scenarios

### 1. Basic Connectivity Test
```python
# test_basic_connection.py
import asyncio
import websockets

async def test():
    uri = "wss://stream.bybit.com/v5/public/spot"
    async with websockets.connect(uri) as ws:
        print("Connected!")
        await ws.close()

asyncio.run(test())
```

### 2. Storage Test
```python
# test_storage_direct.py
import asyncio
from src.collectors.storage.memory import InMemoryStorage
from src.entities.trade import Trade, TradeSide
from decimal import Decimal
from datetime import datetime

async def test():
    storage = InMemoryStorage()
    
    # Create and store trade
    trade = Trade(
        symbol="BTCUSDT",
        side=TradeSide.BUY,
        price=Decimal("100000"),
        quantity=Decimal("0.001"),
        timestamp=datetime.now(),
        exchange="test",
        trade_id="test-1"
    )
    
    await storage.store_trade(trade)
    trades = await storage.get_recent_trades()
    
    print(f"Stored trades: {len(trades)}")
    print(f"Stats: {await storage.get_stats()}")

asyncio.run(test())
```

### 3. Full Integration Test
```bash
# Start fresh
docker-compose down -v
docker-compose up --build -d

# Wait for startup
sleep 10

# Check health
curl http://localhost:8000/health

# Wait for some trades
sleep 30

# Verify trades are stored
curl http://localhost:8000/collectors/trades?limit=10
```

## Debugging Checklist

- [ ] WebSocket connects successfully
- [ ] Subscription confirmed by exchange
- [ ] Messages are being received
- [ ] Messages are being parsed correctly
- [ ] Trade entities are created without errors
- [ ] Storage handler is not None
- [ ] Storage handler is the same instance as manager's
- [ ] No exceptions in storage operations
- [ ] Trades appear in storage stats
- [ ] Trades can be retrieved via API

## Emergency Recovery

If all else fails:

1. **Full restart:**
   ```bash
   docker-compose down -v
   docker system prune -f
   docker-compose build --no-cache
   docker-compose up
   ```

2. **Check Docker daemon:**
   ```bash
   systemctl status docker
   docker version
   ```

3. **Verify port availability:**
   ```bash
   netstat -tulpn | grep 8000
   ```

4. **Review Docker logs:**
   ```bash
   docker-compose logs --tail=1000 > debug.log
   ```
