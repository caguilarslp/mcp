# Rebuild and Test Commands

## 1. Stop and rebuild containers
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 2. Check logs with more detail
```bash
docker-compose logs -f app
```

## 3. Test endpoints
```bash
# Health check
curl http://localhost:8000/health

# Collector status
curl http://localhost:8000/collectors/status

# Storage stats
curl http://localhost:8000/collectors/storage/stats

# Recent trades
curl "http://localhost:8000/collectors/trades?limit=5"
```

## 4. Debug if still not working
If the collector is still not connecting, check:
- Is the Bybit WebSocket URL correct?
- Are there any network issues from Docker?
- Check the detailed logs for connection errors

## Expected behavior
You should see in the logs:
1. "Connecting to WebSocket: wss://stream.bybit.com/v5/public/spot"
2. "WebSocket connection established for bybit_trades"
3. "Successfully subscribed to: publicTrade.BTCUSDT"
4. Trade messages coming in

## If connection fails
Common issues:
- DNS resolution in Docker
- Firewall blocking WebSocket connections
- Bybit API changes or rate limiting
