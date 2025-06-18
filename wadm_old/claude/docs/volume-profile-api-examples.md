# Volume Profile API Response Examples

## Real-time Volume Profile Response

### Endpoint
`GET /api/v1/volume-profile/current/{symbol}`

### Example Response
```json
{
  "symbol": "BTCUSDT",
  "exchange": "bybit",
  "timeframe": "5m",
  "start_time": "2024-11-27T10:25:00Z",
  "end_time": "2024-11-27T10:30:00Z",
  "profile": {
    "price_levels": {
      "95250.0": 125.34,
      "95251.0": 89.45,
      "95252.0": 234.67,
      "95253.0": 567.89,
      "95254.0": 432.10,
      "95255.0": 321.45
    },
    "poc_price": 95253.0,
    "vah_price": 95254.5,
    "val_price": 95251.5,
    "total_volume": 1770.90,
    "value_area_volume": 1239.63,
    "buy_volume": 1150.58,
    "sell_volume": 620.32,
    "delta": 530.26,
    "trades_count": 485
  },
  "analysis": {
    "trend": "bullish",
    "poc_strength": 85.6,
    "value_area_percentage": 70.0,
    "buy_pressure": 65.0,
    "key_levels": [
      {
        "price": 95253.0,
        "type": "poc",
        "strength": 95.2
      },
      {
        "price": 95250.0,
        "type": "support",
        "strength": 78.5
      }
    ]
  }
}
```

## Historical Volume Profile Response

### Endpoint
`GET /api/v1/volume-profile/historical/{symbol}`

### Example Response
```json
{
  "profiles": [
    {
      "symbol": "BTCUSDT",
      "exchange": "bybit",
      "start_time": "2024-11-27T09:00:00Z",
      "end_time": "2024-11-27T10:00:00Z",
      "poc_price": 95150.0,
      "vah_price": 95180.0,
      "val_price": 95120.0,
      "total_volume": 15234.56,
      "value_area_volume": 10664.19
    },
    {
      "symbol": "BTCUSDT",
      "exchange": "bybit",
      "start_time": "2024-11-27T10:00:00Z",
      "end_time": "2024-11-27T11:00:00Z",
      "poc_price": 95253.0,
      "vah_price": 95280.0,
      "val_price": 95220.0,
      "total_volume": 18456.78,
      "value_area_volume": 12919.75
    }
  ],
  "summary": {
    "average_poc": 95201.5,
    "poc_trend": "ascending",
    "volume_trend": "increasing",
    "periods_analyzed": 2
  }
}
```

## POC Analysis Response

### Endpoint
`GET /api/v1/volume-profile/poc-analysis/{symbol}`

### Example Response
```json
{
  "symbol": "BTCUSDT",
  "exchange": "bybit",
  "current_price": 95255.0,
  "current_poc": 95253.0,
  "distance_from_poc": 2.0,
  "poc_history": [
    {
      "timestamp": "2024-11-27T10:00:00Z",
      "poc_price": 95253.0,
      "volume_at_poc": 567.89,
      "strength": 95.2
    },
    {
      "timestamp": "2024-11-27T09:00:00Z",
      "poc_price": 95150.0,
      "volume_at_poc": 445.67,
      "strength": 88.5
    }
  ],
  "analysis": {
    "poc_trend": "ascending",
    "poc_stability": "high",
    "price_position": "above_poc",
    "recommendation": "Price near strong POC level, expect support"
  }
}
```

## Value Area Analysis Response

### Endpoint
`GET /api/v1/volume-profile/value-area/{symbol}`

### Example Response
```json
{
  "symbol": "BTCUSDT",
  "exchange": "bybit",
  "timeframe": "1h",
  "value_area": {
    "vah": 95280.0,
    "val": 95220.0,
    "poc": 95253.0,
    "width": 60.0,
    "volume_percentage": 70.0
  },
  "current_price": 95255.0,
  "price_position": "inside_value_area",
  "distance_to_vah": 25.0,
  "distance_to_val": 35.0,
  "analysis": {
    "market_state": "balanced",
    "expectation": "Range-bound trading within value area",
    "key_levels": {
      "resistance": 95280.0,
      "support": 95220.0,
      "pivot": 95253.0
    }
  }
}
```

## Market Structure Response

### Endpoint
`GET /api/v1/volume-profile/market-structure/{symbol}`

### Example Response
```json
{
  "symbol": "BTCUSDT",
  "exchange": "bybit",
  "analysis_period": "24h",
  "structure": {
    "trend": "bullish",
    "strength": 72.5,
    "phase": "markup",
    "key_levels": [
      {
        "price": 95500.0,
        "type": "resistance",
        "touches": 3,
        "strength": 85.5
      },
      {
        "price": 95253.0,
        "type": "poc",
        "touches": 8,
        "strength": 95.2
      },
      {
        "price": 95000.0,
        "type": "support",
        "touches": 5,
        "strength": 88.7
      }
    ]
  },
  "volume_analysis": {
    "increasing_on_rallies": true,
    "decreasing_on_pullbacks": true,
    "average_volume": 15678.90,
    "current_volume": 18456.78,
    "volume_trend": "expanding"
  },
  "recommendation": "Bullish structure intact, buy pullbacks to POC"
}
```

## Field Descriptions

### Volume Profile Fields
- `price_levels`: Dictionary mapping price to volume
- `poc_price`: Point of Control - price with highest volume
- `vah_price`: Value Area High - upper boundary of 70% volume area
- `val_price`: Value Area Low - lower boundary of 70% volume area
- `total_volume`: Total volume in the period
- `value_area_volume`: Volume within the value area (typically 70%)
- `buy_volume`: Total buy-side volume
- `sell_volume`: Total sell-side volume
- `delta`: Net difference (buy - sell)
- `trades_count`: Number of trades

### Analysis Fields
- `trend`: Current trend direction (bullish/bearish/neutral)
- `poc_strength`: Strength of POC level (0-100)
- `value_area_percentage`: Percentage of volume in value area
- `buy_pressure`: Percentage of buy volume
- `key_levels`: Important price levels with type and strength

### Market Structure Fields
- `phase`: Market phase (accumulation/markup/distribution/markdown)
- `touches`: Number of times price tested the level
- `increasing_on_rallies`: Whether volume increases on up moves
- `decreasing_on_pullbacks`: Whether volume decreases on down moves
- `volume_trend`: Overall volume trend (expanding/contracting/stable)
