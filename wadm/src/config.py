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
# Simple MongoDB connection for development (no auth)
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://mongodb:27017/wadm")

# Symbols to collect - Updated 2025-06-21
# All exchanges track the same 19 symbols
# Core Focus: ISO20022, RWA/Tokenization, AI - Reference: BTC, ETH, SOL
BASE_SYMBOLS = os.getenv("ALL_SYMBOLS", 
    "BTCUSDT,ETHUSDT,SOLUSDT,"  # Reference (3)
    "XRPUSDT,XLMUSDT,ALGOUSDT,ADAUSDT,HBARUSDT,QNTUSDT,"  # ISO20022 (6)
    "LINKUSDT,POLYXUSDT,ONDOUSDT,TRUUSDT,"  # RWA/Tokenization (4)
    "FETUSDT,OCEANUSDT,AGIXUSDT,TAOUSDT,VIRTUALUSDT,ICPUSDT"  # AI (6)
).split(",")

# Helper function to convert symbol formats
def convert_symbol_format(symbols: List[str], exchange: str) -> List[str]:
    """Convert symbols to exchange-specific format"""
    converted = []
    for symbol in symbols:
        if exchange == "coinbase":
            # Coinbase uses BTC-USDT format
            converted.append(symbol.replace("USDT", "-USDT"))
        elif exchange == "kraken":
            # Kraken uses XBT for Bitcoin
            if symbol == "BTCUSDT":
                converted.append("XBTUSDT")
            else:
                converted.append(symbol)
        else:
            converted.append(symbol)
    return converted

# Apply format conversions
BYBIT_SYMBOLS = BASE_SYMBOLS  # Standard format
BINANCE_SYMBOLS = BASE_SYMBOLS  # Standard format
COINBASE_SYMBOLS = convert_symbol_format(BASE_SYMBOLS, "coinbase")
KRAKEN_SYMBOLS = convert_symbol_format(BASE_SYMBOLS, "kraken")

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

# New indicator settings - Added 2025-06-21
BOLLINGER_PERIOD = 20  # Bollinger Bands period
BOLLINGER_STD_DEV = 2  # Standard deviations
ELLIOTT_MIN_WAVE_SIZE = 0.01  # Minimum 1% move for Elliott Wave
VWAP_ANCHORS = ["daily", "weekly", "monthly"]  # VWAP anchor points
MULTI_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"]  # For MTF analysis

# Symbol categories for easy filtering
SYMBOL_CATEGORIES = {
    "reference": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    "iso20022": ["XRPUSDT", "XLMUSDT", "ALGOUSDT", "ADAUSDT", "HBARUSDT", "QNTUSDT"],
    "rwa": ["LINKUSDT", "POLYXUSDT", "ONDOUSDT", "TRUUSDT"],
    "ai": ["FETUSDT", "OCEANUSDT", "AGIXUSDT", "TAOUSDT", "VIRTUALUSDT", "ICPUSDT"]
}


class Config:
    """Configuration class for API compatibility"""
    
    # Application
    APP_NAME = APP_NAME
    APP_VERSION = APP_VERSION
    ENVIRONMENT = ENVIRONMENT
    LOG_LEVEL = LOG_LEVEL
    
    # Database
    MONGODB_URL = MONGODB_URL
    MONGO_DB = "wadm"
    
    # Symbols - Create dict format from base symbols
    SYMBOLS = {symbol: symbol for symbol in BASE_SYMBOLS}
    
    # Symbols
    BASE_SYMBOLS = BASE_SYMBOLS
    BYBIT_SYMBOLS = BYBIT_SYMBOLS
    BINANCE_SYMBOLS = BINANCE_SYMBOLS
    COINBASE_SYMBOLS = COINBASE_SYMBOLS
    KRAKEN_SYMBOLS = KRAKEN_SYMBOLS
    
    # Reference to category lists
    REFERENCE_SYMBOLS = ["BTC", "ETH", "SOL"]
    ISO20022_SYMBOLS = ["XRP", "XLM", "ALGO", "ADA", "HBAR", "QNT"]
    RWA_SYMBOLS = ["LINK", "POLYX", "ONDO", "TRU"]
    AI_SYMBOLS = ["FET", "OCEAN", "AGIX", "TAO", "VIRTUAL", "ICP"]
    
    # WebSocket URLs
    BYBIT_WS_URL = BYBIT_WS_URL
    BINANCE_WS_URL = BINANCE_WS_URL
    
    # Data retention
    TRADES_RETENTION = TRADES_RETENTION
    INDICATORS_RETENTION = INDICATORS_RETENTION
    
    # Paths
    PROJECT_ROOT = PROJECT_ROOT
    LOGS_DIR = LOGS_DIR
