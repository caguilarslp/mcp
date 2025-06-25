# MCP Integration Architecture

## Overview
This document describes the architecture for integrating the waickoff_mcp server (119+ trading analysis tools) with the WADM API using Docker containers.

## Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   WADM API      │     │   MCP Server    │
│  (Future)       │────▶│  Container      │────▶│   Container     │
│                 │HTTP │                 │HTTP │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────┐           ┌─────────────┐
                        │   MongoDB    │           │ HTTP Wrapper │
                        │  Container   │           │  (FastAPI)   │
                        └─────────────┘           └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │ MCP Process  │
                                                  │   (stdio)    │
                                                  └─────────────┘
```

## Components

### 1. MCP Server Container
- **Image**: Custom multi-stage build
- **Base**: Node.js 20 + Python 3.12
- **Components**:
  - waickoff_mcp server (TypeScript)
  - HTTP wrapper (Python/FastAPI)
- **Port**: 3000 (internal)
- **Protocol**: HTTP externally, stdio internally

### 2. WADM API Container
- **Image**: Python 3.12
- **Framework**: FastAPI
- **MCP Client**: httpx-based
- **Features**:
  - Session management
  - API key authentication
  - Rate limiting
  - Token tracking

### 3. Communication Flow
1. Client sends request to WADM API
2. API validates session/auth
3. API calls MCP via HTTP
4. HTTP wrapper translates to stdio
5. MCP processes with 119+ tools
6. Response flows back through chain

## MCP Tools Categories

### Market Data (10+ tools)
- `get_ticker` - Current price and stats
- `get_orderbook` - Order book depth
- `get_market_data` - Comprehensive data
- `get_aggregated_ticker` - Multi-exchange
- `get_composite_orderbook` - Unified orderbook

### Wyckoff Analysis (15+ tools)
- `analyze_wyckoff_phase` - Current phase detection
- `find_wyckoff_events` - Springs, upthrusts
- `analyze_composite_man` - Institutional activity
- `track_institutional_flow` - Money flow patterns
- `analyze_multi_timeframe_wyckoff` - MTF analysis

### Smart Money Concepts (20+ tools)
- `detect_order_blocks` - Institutional zones
- `find_fair_value_gaps` - FVG imbalances
- `detect_break_of_structure` - BOS/CHoCH
- `analyze_smart_money_confluence` - Complete SMC
- `validate_smc_setup` - Trade validation

### Technical Analysis (20+ tools)
- `perform_technical_analysis` - All indicators
- `calculate_fibonacci_levels` - Fib retracements
- `analyze_bollinger_bands` - BB with squeeze
- `detect_elliott_waves` - Wave patterns
- `find_technical_confluences` - Multi-indicator

### Volume Analysis (10+ tools)
- `analyze_volume` - VWAP and patterns
- `analyze_volume_delta` - Buy/sell pressure
- `identify_volume_anomalies` - Unusual activity
- `analyze_wyckoff_volume` - Wyckoff context

### Context & Historical (15+ tools)
- `get_master_context` - 3-month history
- `analyze_with_historical_context` - Context-aware
- `get_analysis_context` - Compressed history
- `update_context_levels` - Level management

### Risk & Liquidation (5+ tools)
- `predict_liquidation_cascade` - Cascade risk
- `detect_bull_trap` - False breakouts
- `detect_bear_trap` - False breakdowns
- `get_trap_statistics` - Historical accuracy

### Trading Tools (10+ tools)
- `suggest_grid_levels` - Grid trading
- `analyze_volatility` - Volatility timing
- `identify_support_resistance` - Dynamic S/R
- `get_smc_trading_setup` - Entry/exit/risk

## Configuration

### Environment Variables
```bash
# API Container
MCP_SERVER_URL=http://mcp-server:3000
MONGODB_URL=mongodb://mongodb:27017/wadm
API_MASTER_KEY=wadm_dev_master_key_2025

# MCP Container
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/wadm
```

### Docker Compose Services
```yaml
services:
  mcp-server:
    build: 
      context: .
      dockerfile: Dockerfile.mcp
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/wadm
    
  wadm-api:
    build: .
    environment:
      - MCP_SERVER_URL=http://mcp-server:3000
    depends_on:
      - mcp-server
```

## API Endpoints

### MCP Integration Endpoints
```
POST   /api/v1/mcp/call              # Call any MCP tool
GET    /api/v1/mcp/tools             # List all tools
GET    /api/v1/mcp/health            # Check MCP health

# Convenience endpoints
POST   /api/v1/mcp/analyze/wyckoff/{symbol}
POST   /api/v1/mcp/analyze/smc/{symbol}
POST   /api/v1/mcp/analyze/complete/{symbol}
POST   /api/v1/mcp/analyze/technical/{symbol}
GET    /api/v1/mcp/analyze/{symbol}/context
```

## Error Handling

### API Level
- HTTP status codes
- Structured error responses
- Retry logic for transient failures
- Circuit breaker pattern (future)

### MCP Level
- JSON-RPC error codes
- Tool-specific error messages
- Timeout handling (60s default)
- Process restart on crash

## Performance Considerations

### Caching (Future)
- Redis for frequent queries
- Context caching for historical data
- Tool result caching with TTL

### Connection Pooling
- httpx persistent connections
- Reuse TCP connections
- Configure pool size based on load

### Timeouts
- Connect: 10 seconds
- Read: 60 seconds (complex analysis)
- Total: 90 seconds maximum

## Security

### API Authentication
- API key required
- Session validation
- Rate limiting per key
- Token usage tracking

### Network Security
- Internal Docker network
- No external MCP exposure
- TLS for production (future)

### Data Security
- MongoDB authentication (production)
- Encrypted storage (future)
- Audit logging

## Monitoring & Logging

### Health Checks
- API: `/api/v1/system/health`
- MCP: `/health` via wrapper
- Docker health checks

### Metrics (Future)
- Request count by tool
- Response times
- Error rates
- Token usage

### Logging
- Structured JSON logs
- Log aggregation (future)
- Error tracking

## Deployment

### Development
```bash
docker-compose up -d
```

### Production (Future)
- Kubernetes deployment
- Horizontal scaling
- Load balancing
- Blue-green deployments

## Troubleshooting

### Common Issues

1. **MCP Not Building**
   - Check TypeScript versions
   - Use `--legacy-peer-deps`
   - Clear node_modules

2. **Connection Refused**
   - Verify container running
   - Check Docker network
   - Verify port mapping

3. **Timeout Errors**
   - Increase timeout values
   - Check MCP performance
   - Monitor memory usage

4. **Auth Failures**
   - Verify API key
   - Check session status
   - Review rate limits

## Future Enhancements

1. **Performance**
   - Redis caching layer
   - Connection pooling
   - Async batch processing

2. **Reliability**
   - Circuit breaker
   - Retry with backoff
   - Health monitoring

3. **Features**
   - WebSocket streaming
   - Batch tool calls
   - Custom tool creation

4. **Infrastructure**
   - Kubernetes migration
   - Auto-scaling
   - Multi-region deployment
