"""
WADM Configuration
Simple configuration management from environment variables
"""
import os
from typing import List
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"

# Ensure logs directory exists
LOGS_DIR.mkdir(exist_ok=True)

# Application
APP_NAME = os.getenv("APP_NAME", "WADM")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Database
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/wadm")

# Symbols to collect
BYBIT_SYMBOLS = os.getenv("BYBIT_SYMBOLS", "BTCUSDT,ETHUSDT,XRPUSDT,HBARUSDT").split(",")
BINANCE_SYMBOLS = os.getenv("BINANCE_SYMBOLS", "BTCUSDT,ETHUSDT,XRPUSDT,HBARUSDT").split(",")
COINBASE_SYMBOLS = os.getenv("COINBASE_SYMBOLS", "BTCUSDT,ETHUSDT,XRPUSDT").split(",")  # HBAR not available
KRAKEN_SYMBOLS = os.getenv("KRAKEN_SYMBOLS", "BTCUSDT,ETHUSDT,XRPUSDT").split(",")  # HBAR not available

# WebSocket URLs
BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot"
BINANCE_WS_URL = "wss://stream.binance.com/stream"

# Data retention (seconds)
TRADES_RETENTION = int(os.getenv("TRADES_RETENTION", "3600"))  # 1 hour
INDICATORS_RETENTION = int(os.getenv("INDICATORS_RETENTION", "86400"))  # 24 hours

# Collector settings
WS_RECONNECT_INTERVAL = int(os.getenv("WS_RECONNECT_INTERVAL", "5"))
WS_PING_INTERVAL = int(os.getenv("WS_PING_INTERVAL", "30"))
BUFFER_SIZE = int(os.getenv("BUFFER_SIZE", "10000"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "50"))  # Reduced for faster processing

# Indicator settings
VOLUME_PROFILE_BINS = 50  # Number of price bins for volume profile
ORDER_FLOW_WINDOW = 60  # Seconds to calculate order flow delta
