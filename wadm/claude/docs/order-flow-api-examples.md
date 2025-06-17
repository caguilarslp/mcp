# Order Flow API Response Examples

## Real-time Order Flow Response

### Endpoint
`GET /api/v1/order-flow/current/{symbol}`

### Example Response
```json
{
  "symbol": "XRPUSDT",
  "order_flow": {
    "net_delta": 123.45,
    "buy_percentage": 65.2,
    "sell_percentage": 34.8,
    "market_efficiency": 78.5,
    "total_trades": 150,
    "total_volume": 2500,
    "buy_volume": 1630,
    "sell_volume": 870,
    "cumulative_delta": 456.78,
    "avg_trade_size": 16.67,
    "delta_momentum": 72.3,
    "levels": [
      {
        "price": 0.6234,
        "buy_volume": 245.5,
        "sell_volume": 122.3,
        "delta": 123.2,
        "trade_count": 25,
        "volume_percentage": 14.7
      }
    ],
    "absorption_events": [],
    "imbalance_events": []
  },
  "market_condition": "bullish_pressure",
  "signals": [
    "BULLISH: Strong positive delta momentum",
    "BULLISH: Buy volume dominance (65.2%)"
  ],
  "timestamp": "2024-11-27T10:30:00Z"
}
```

## Market Conditions

### Possible Values
- `balanced` - Market efficiency > 80%
- `strong_buying` - Net delta > 20% of total volume
- `strong_selling` - Net delta < -20% of total volume
- `absorption_detected` - Absorption events present
- `neutral` - Default condition

## Signal Types

### Delta Signals
- `BULLISH: Strong positive delta momentum` - When delta momentum > 70
- `BEARISH: Strong negative delta momentum` - When delta momentum < -70

### Absorption Signals
- `ABSORPTION: Strong {type} at {price}` - When absorption strength > 80

### Imbalance Signals
- `IMBALANCE: {direction} zone {start}-{end}` - When imbalance strength > 75

## Field Descriptions

### Order Flow Object
- `net_delta`: Buy volume - Sell volume for the period
- `buy_percentage`: Percentage of total volume that was buy-side
- `sell_percentage`: Percentage of total volume that was sell-side
- `market_efficiency`: How balanced the market is (0-100)
- `total_trades`: Number of trades in the period
- `total_volume`: Total volume traded
- `buy_volume`: Total buy-side volume
- `sell_volume`: Total sell-side volume
- `cumulative_delta`: Running total of delta
- `avg_trade_size`: Average size per trade
- `delta_momentum`: Momentum indicator based on delta changes

### Level Object
- `price`: Price level
- `buy_volume`: Buy volume at this price
- `sell_volume`: Sell volume at this price
- `delta`: Net delta at this price level
- `trade_count`: Number of trades at this level
- `volume_percentage`: Percentage of total volume at this level

## Error Responses

### 500 Internal Server Error
```json
{
  "detail": "Error getting current order flow: {error_message}"
}
```

### 400 Bad Request
```json
{
  "detail": "Invalid timestamp format: {error_message}"
}
```
