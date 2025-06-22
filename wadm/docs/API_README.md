# WADM API Documentation

## Overview
The WADM (wAIckoff Data Manager) API provides RESTful endpoints for accessing Smart Money analysis data, market indicators, and trading signals.

## Quick Start

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Run the API server
python api_server.py
```

### Testing
```bash
# Run test suite
python test_api.py
```

## Base URL
- Local: `http://localhost:8000`
- Production: TBD

## Authentication
All protected endpoints require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8000/api/v1/market/trades/BTCUSDT
```

Default development key: `wadm-dev-key-change-in-production`

## Rate Limiting
- 100 requests per minute per API key
- Rate limit info in response headers:
  - `X-RateLimit-Limit`: Total allowed requests
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp of reset

## API Documentation
Interactive documentation available at:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Endpoints

### System Status

#### Health Check
```http
GET /api/v1/system/health
```
No authentication required. Returns system health status.

#### System Metrics
```http
GET /api/v1/system/metrics
```
Returns CPU, memory, and disk usage metrics.

#### Database Status
```http
GET /api/v1/system/database
```
Returns MongoDB connection status and collection statistics.

#### Exchange Status
```http
GET /api/v1/system/exchanges
```
Returns status of all connected exchanges.

### Market Data

#### Get Trades
```http
GET /api/v1/market/trades/{symbol}
```
Parameters:
- `symbol` (path): Trading pair (e.g., BTCUSDT)
- `exchange` (query): Filter by exchange
- `start_time` (query): ISO format datetime
- `end_time` (query): ISO format datetime
- `page` (query): Page number (default: 1)
- `per_page` (query): Items per page (default: 100, max: 1000)

#### Get Candles
```http
GET /api/v1/market/candles/{symbol}/{timeframe}
```
Parameters:
- `symbol` (path): Trading pair
- `timeframe` (path): 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w
- `exchange` (query): Filter by exchange
- `start_time` (query): ISO format datetime
- `end_time` (query): ISO format datetime
- `limit` (query): Number of candles (default: 500, max: 1000)

#### Get Symbols
```http
GET /api/v1/market/symbols
```
Parameters:
- `category` (query): Filter by category (reference, iso20022, rwa, ai)
- `active` (query): Filter by active status

#### Market Statistics
```http
GET /api/v1/market/stats/{symbol}
```
Get OHLCV statistics for a symbol over a timeframe.

#### Market Summary
```http
GET /api/v1/market/summary
```
Get overall market summary across all symbols and exchanges.

### Authentication

#### Verify API Key
```http
GET /api/v1/auth/keys/verify
```
Verify your API key and get account info.

## Response Format

### Success Response
```json
{
  "data": {...},
  "page": 1,
  "per_page": 100,
  "total": 1543,
  "pages": 16
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "details": {...}
  }
}
```

## WebSocket Streaming (Coming Soon)
Real-time data streaming will be available at:
```
ws://localhost:8000/api/v1/ws/stream
```

## Examples

### Get Bitcoin Trades
```bash
curl -H "X-API-Key: wadm-dev-key-change-in-production" \
  "http://localhost:8000/api/v1/market/trades/BTCUSDT?per_page=10"
```

### Get 1-hour Candles
```bash
curl -H "X-API-Key: wadm-dev-key-change-in-production" \
  "http://localhost:8000/api/v1/market/candles/BTCUSDT/1h?limit=100"
```

### Check System Status
```bash
curl -H "X-API-Key: wadm-dev-key-change-in-production" \
  "http://localhost:8000/api/v1/system/status"
```

## Error Codes
- `400` Bad Request - Invalid parameters
- `401` Unauthorized - Missing or invalid API key
- `404` Not Found - Resource not found
- `422` Validation Error - Invalid request body
- `429` Rate Limit Exceeded - Too many requests
- `500` Internal Server Error - Server error

## Support
For issues or questions, please check the project documentation or create an issue in the repository.
