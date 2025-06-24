# MCP Server Integration

## Overview

The WADM API now includes full integration with the WAIckoff MCP Server, providing access to 117+ advanced market analysis tools through a simple REST API.

## Available Endpoints

### Core MCP Endpoints

- `POST /api/v1/mcp/call` - Call any MCP tool directly
- `GET /api/v1/mcp/tools` - List all available tools
- `GET /api/v1/mcp/health` - Check MCP server health

### Convenience Endpoints

- `POST /api/v1/mcp/analyze/wyckoff/{symbol}` - Wyckoff phase analysis
- `POST /api/v1/mcp/analyze/smc/{symbol}` - Smart Money Concepts analysis
- `POST /api/v1/mcp/analyze/complete/{symbol}` - Complete market analysis
- `POST /api/v1/mcp/analyze/technical/{symbol}` - Technical indicators
- `GET /api/v1/mcp/analyze/{symbol}/context` - 3-month historical context

## Authentication

All MCP endpoints require an active session:
- Use API key in `X-API-Key` header
- Session-based billing applies ($1 per session)
- Token usage is tracked automatically

## Example Usage

### 1. Get Market Data
```bash
curl -X POST http://localhost:8000/api/v1/mcp/call \
  -H "X-API-Key: wadm-master-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_ticker",
    "params": {"symbol": "BTCUSDT"}
  }'
```

### 2. Wyckoff Analysis
```bash
curl -X POST http://localhost:8000/api/v1/mcp/analyze/wyckoff/BTCUSDT?timeframe=60 \
  -H "X-API-Key: wadm-master-key-2024"
```

### 3. Complete Analysis with Grid Suggestions
```bash
curl -X POST http://localhost:8000/api/v1/mcp/call \
  -H "X-API-Key: wadm-master-key-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_complete_analysis",
    "params": {
      "symbol": "ETHUSDT",
      "investment": 10000
    }
  }'
```

## Available MCP Tools (Main Categories)

### Market Data (10+ tools)
- `get_ticker` - Current price and statistics
- `get_orderbook` - Order book depth
- `get_market_data` - Comprehensive market snapshot
- `get_aggregated_ticker` - Multi-exchange data

### Technical Analysis (20+ tools)
- `perform_technical_analysis` - All indicators
- `calculate_fibonacci_levels` - Auto swing detection
- `analyze_bollinger_bands` - With squeeze detection
- `detect_elliott_waves` - Pattern recognition

### Wyckoff Analysis (15+ tools)
- `analyze_wyckoff_phase` - Current phase detection
- `find_wyckoff_events` - Springs, upthrusts, tests
- `analyze_composite_man` - Institutional manipulation
- `track_institutional_flow` - Smart money tracking

### Smart Money Concepts (20+ tools)
- `detect_order_blocks` - Institutional zones
- `find_fair_value_gaps` - Imbalance detection
- `detect_break_of_structure` - BOS/CHoCH
- `analyze_smart_money_confluence` - Complete SMC

### Volume Analysis (10+ tools)
- `analyze_volume` - VWAP and patterns
- `analyze_volume_delta` - Buying vs selling
- `identify_volume_anomalies` - Unusual activity

### Complete Analysis (5+ tools)
- `get_complete_analysis` - All-in-one analysis
- `complete_analysis_with_context` - With historical data
- `generate_wyckoff_insights` - Advanced insights

### Multi-Exchange (10+ tools)
- `detect_exchange_divergences` - Arbitrage opportunities
- `predict_liquidation_cascade` - Risk assessment
- `analyze_exchange_dominance` - Leading exchange

## Response Format

All MCP calls return a standardized response:

```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "session_id": "sess_abc123",
  "tokens_used": 150,
  "execution_time_ms": 250,
  "timestamp": "2025-06-24T10:30:00Z",
  "tool": "analyze_wyckoff_phase"
}
```

## Error Handling

Errors return appropriate HTTP status codes:
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (no active session)
- `429` - Rate limit exceeded
- `500` - Internal server error

## Token Usage

Token usage varies by tool complexity:
- Simple queries: 50-100 tokens
- Technical analysis: 100-200 tokens
- Complete analysis: 200-500 tokens
- Multi-timeframe: 300-800 tokens

## Testing

Run the test script to verify integration:
```bash
python test_mcp_integration.py
```

## Implementation Status

✅ **Completed:**
- FastAPI router and endpoints
- Session integration
- Token tracking
- Mock responses for immediate testing
- Complete tool listing
- Convenience endpoints

🔄 **In Progress:**
- HTTP wrapper for real MCP calls
- Response caching
- Batch tool calls

⏳ **Planned:**
- WebSocket streaming
- Tool chaining
- Custom analysis templates

## Notes

Currently using mock responses until MCP HTTP wrapper is implemented. This allows immediate API testing and frontend development while the wrapper is being built.

To enable real MCP calls:
1. Implement HTTP wrapper (see `docs/MCP_HTTP_WRAPPER_GUIDE.md`)
2. Set `MCP_HTTP_URL` environment variable
3. Update `client_http.py` to make real HTTP calls
