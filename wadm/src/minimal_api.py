"""
Minimal working API for WADM Order Flow testing.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="WADM - Order Flow API",
    description="Minimal working API for testing",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Order Flow API is running"}

@app.get("/api/v1/order-flow/current/{symbol}")
async def get_current_order_flow(symbol: str):
    """Test endpoint for current order flow."""
    return {
        "symbol": symbol,
        "order_flow": {
            "net_delta": 123.45,
            "buy_percentage": 65.2,
            "sell_percentage": 34.8,
            "market_efficiency": 78.5,
            "total_trades": 150,
            "total_volume": 2500.0
        },
        "market_condition": "bullish_pressure",
        "signals": ["bullish_delta", "increasing_momentum"],
        "timestamp": "2025-06-17T22:00:00Z"
    }

@app.get("/api/v1/order-flow/market-efficiency/{symbol}")
async def get_market_efficiency(symbol: str):
    """Test endpoint for market efficiency."""
    return {
        "symbol": symbol,
        "efficiency_score": 78.5,
        "market_condition": "balanced",
        "buy_dominance": 52.3,
        "sell_dominance": 47.7,
        "periods_analyzed": 12
    }

@app.get("/api/v1/order-flow/delta-analysis/{symbol}")
async def get_delta_analysis(symbol: str):
    """Test endpoint for delta analysis."""
    return {
        "symbol": symbol,
        "trend": "bullish",
        "strength": 67.8,
        "cumulative_delta": 456.78,
        "avg_delta_momentum": 23.4,
        "recent_delta": 234.56,
        "older_delta": 123.45
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8920)
