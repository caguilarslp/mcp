"""
WADM Configuration with HIGH PRECISION settings
Simple configuration management from environment variables
"""
import os
from typing import List
from pathlib import Path
from decimal import Decimal

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

# PRECISION SETTINGS FOR INSTITUTIONAL TRADING
PRICE_DECIMAL_PLACES = int(os.getenv("PRICE_DECIMAL_PLACES", "6"))  # 6 decimals for prices
QUANTITY_DECIMAL_PLACES = int(os.getenv("QUANTITY_DECIMAL_PLACES", "8"))  # 8 decimals for quantities
USE_DECIMAL_PRECISION = os.getenv("USE_DECIMAL_PRECISION", "true").lower() == "true"

# Database
# MongoDB connection - supports both DATABASE_URL and MONGODB_URL for compatibility
MONGODB_URL = os.getenv("DATABASE_URL", os.getenv("MONGODB_URL", "mongodb://mongo:27017/wadm"))

# MongoDB settings for decimal storage
MONGODB_DECIMAL128 = True  # Use Decimal128 for precise storage

# Symbols to collect - Updated 2025-06-22
# CENTRALIZED CONFIGURATION: All symbols come from ALL_SYMBOLS environment variable
# This eliminates duplication between docker-compose.yml, config.py, and app.env

# Read base symbols from ALL_SYMBOLS environment variable (set in docker-compose.yml)
BASE_SYMBOLS = os.getenv("ALL_SYMBOLS", 
    "BTCUSDT,ETHUSDT,SOLUSDT,TRXUSDT,XRPUSDT,XLMUSDT,HBARUSDT,ADAUSDT"
).split(",")

# Helper function to convert symbol formats for different exchanges
def convert_symbol_format(symbols: List[str], exchange: str) -> List[str]:
    """Convert symbols to exchange-specific format"""
    converted = []
    for symbol in symbols:
        if exchange == "coinbase":
            # Coinbase uses BTC-USD format (convert BTCUSDT -> BTC-USD)
            base = symbol.replace("USDT", "")
            converted.append(f"{base}-USD")
        elif exchange == "kraken":
            # Kraken uses XBT for Bitcoin and / separator
            if symbol == "BTCUSDT":
                converted.append("XBT/USD")
            else:
                base = symbol.replace("USDT", "")
                converted.append(f"{base}/USD")
        else:
            # For other exchanges (Binance, Bybit), keep original format
            converted.append(symbol)
    return converted

# Apply format conversions for each exchange
BYBIT_SYMBOLS = BASE_SYMBOLS  # Standard USDT format
BINANCE_SYMBOLS = BASE_SYMBOLS  # Standard USDT format
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

# Indicator settings with PRECISION
VOLUME_PROFILE_BINS = 50  # Number of price bins for volume profile
ORDER_FLOW_WINDOW = 60  # Seconds to calculate order flow delta

# Footprint settings for institutional analysis
FOOTPRINT_TICK_SIZE = Decimal("0.01")  # Minimum price increment for footprint
FOOTPRINT_TIME_FRAME = 60  # Seconds per footprint bar
FOOTPRINT_IMBALANCE_THRESHOLD = Decimal("3.0")  # 3:1 ratio for imbalance detection

# Market Profile settings
MARKET_PROFILE_TPO_SIZE = 30  # Minutes per TPO (letter)
MARKET_PROFILE_VALUE_AREA_PERCENT = 70  # Standard 70% for value area

# Liquidation settings
LIQUIDATION_LEVELS = [1, 2, 3, 5, 10, 20, 25, 50, 100]  # Common leverage levels
LIQUIDATION_BUFFER_PERCENT = Decimal("0.5")  # 0.5% buffer for liquidation calculations

# Institutional thresholds
LARGE_TRADE_THRESHOLD = {
    "BTCUSDT": Decimal("0.5"),    # 0.5 BTC
    "ETHUSDT": Decimal("5.0"),    # 5 ETH
    "default": Decimal("10000.0")  # $10,000 USD equivalent
}

# Dark pool detection settings
DARK_POOL_MIN_SIZE_MULTIPLIER = Decimal("10.0")  # 10x average trade size
DARK_POOL_TIME_WINDOW = 1  # 1 second window for clustering

# New indicator settings - Added 2025-06-21
BOLLINGER_PERIOD = 20  # Bollinger Bands period
BOLLINGER_STD_DEV = 2  # Standard deviations
ELLIOTT_MIN_WAVE_SIZE = 0.01  # Minimum 1% move for Elliott Wave
VWAP_ANCHORS = ["daily", "weekly", "monthly"]  # VWAP anchor points
MULTI_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"]  # For MTF analysis

# Symbol categories for easy filtering - UTILITY FOCUSED
SYMBOL_CATEGORIES = {
    "reference": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "TRXUSDT"],  # Major reference cryptos
    "iso20022": ["XRPUSDT", "XLMUSDT", "HBARUSDT", "ADAUSDT", "QNTUSDT", "ALGOUSDT"],  # ISO20022 standard
    "rwa": ["ONDOUSDT", "LINKUSDT", "POLYXUSDT", "TRUUSDT", "RIOUSDT", "MANTRAUSDT"],  # Real World Assets
    "ai": ["RENDERUSDT", "ICPUSDT", "FETUSDT", "OCEANUSDT", "AGIXUSDT", "TAOUSDT", "VIRTUALUSDT", "ARKMUSDT"]  # AI & Computing
}


class Config:
    """Configuration class for API compatibility with HIGH PRECISION"""
    
    # Application
    APP_NAME = APP_NAME
    APP_VERSION = APP_VERSION
    ENVIRONMENT = ENVIRONMENT
    LOG_LEVEL = LOG_LEVEL
    
    # Precision settings
    PRICE_DECIMAL_PLACES = PRICE_DECIMAL_PLACES
    QUANTITY_DECIMAL_PLACES = QUANTITY_DECIMAL_PLACES
    USE_DECIMAL_PRECISION = USE_DECIMAL_PRECISION
    
    # Database
    MONGODB_URL = MONGODB_URL
    MONGO_DB = "wadm"
    MONGODB_DECIMAL128 = MONGODB_DECIMAL128
    
    # Symbols - Create dict format from base symbols
    SYMBOLS = {symbol: symbol for symbol in BASE_SYMBOLS}
    
    # Exchange-specific symbols (read from environment)
    BASE_SYMBOLS = BASE_SYMBOLS
    BYBIT_SYMBOLS = BYBIT_SYMBOLS
    BINANCE_SYMBOLS = BINANCE_SYMBOLS
    COINBASE_SYMBOLS = COINBASE_SYMBOLS
    KRAKEN_SYMBOLS = KRAKEN_SYMBOLS
    
    # Symbol categories for utility-focused trading
    REFERENCE_SYMBOLS = ["BTC", "ETH", "SOL", "TRX"]  # Major reference
    ISO20022_SYMBOLS = ["XRP", "XLM", "HBAR", "ADA", "QNT", "ALGO"]  # ISO20022 standard
    RWA_SYMBOLS = ["ONDO", "LINK", "POLYX", "TRU", "RIO", "MANTRA"]  # Real World Assets  
    AI_SYMBOLS = ["RENDER", "ICP", "FET", "OCEAN", "AGIX", "TAO", "VIRTUAL", "ARKM"]  # AI & Computing
    
    # WebSocket URLs
    BYBIT_WS_URL = BYBIT_WS_URL
    BINANCE_WS_URL = BINANCE_WS_URL
    
    # Data retention
    TRADES_RETENTION = TRADES_RETENTION
    INDICATORS_RETENTION = INDICATORS_RETENTION
    
    # Institutional settings
    FOOTPRINT_TICK_SIZE = FOOTPRINT_TICK_SIZE
    FOOTPRINT_TIME_FRAME = FOOTPRINT_TIME_FRAME
    FOOTPRINT_IMBALANCE_THRESHOLD = FOOTPRINT_IMBALANCE_THRESHOLD
    MARKET_PROFILE_TPO_SIZE = MARKET_PROFILE_TPO_SIZE
    LIQUIDATION_LEVELS = LIQUIDATION_LEVELS
    LARGE_TRADE_THRESHOLD = LARGE_TRADE_THRESHOLD
    DARK_POOL_MIN_SIZE_MULTIPLIER = DARK_POOL_MIN_SIZE_MULTIPLIER
    
    # Paths
    PROJECT_ROOT = PROJECT_ROOT
    LOGS_DIR = LOGS_DIR
