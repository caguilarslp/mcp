"""
Symbol definitions and market categorization for WADM
"""
from typing import Dict, List, Set
from dataclasses import dataclass

@dataclass
class SymbolInfo:
    """Symbol information and metadata"""
    symbol: str
    name: str
    category: str
    subcategory: str = ""
    exchanges: List[str] = None
    
    def __post_init__(self):
        if self.exchanges is None:
            self.exchanges = ["bybit", "binance"]

# Symbol definitions by category
SYMBOLS = {
    # Reference cryptocurrencies
    "reference": {
        "BTCUSDT": SymbolInfo("BTCUSDT", "Bitcoin", "reference", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "ETHUSDT": SymbolInfo("ETHUSDT", "Ethereum", "reference", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "SOLUSDT": SymbolInfo("SOLUSDT", "Solana", "reference", exchanges=["bybit", "binance", "coinbase", "kraken"]),
    },
    
    # ISO20022 compliant
    "iso20022": {
        "XRPUSDT": SymbolInfo("XRPUSDT", "Ripple", "iso20022", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "XLMUSDT": SymbolInfo("XLMUSDT", "Stellar", "iso20022", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "ALGOUSDT": SymbolInfo("ALGOUSDT", "Algorand", "iso20022", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "ADAUSDT": SymbolInfo("ADAUSDT", "Cardano", "iso20022", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "HBARUSDT": SymbolInfo("HBARUSDT", "Hedera", "iso20022", exchanges=["bybit", "binance"]),
        "QNTUSDT": SymbolInfo("QNTUSDT", "Quant", "iso20022", exchanges=["bybit", "binance"]),
    },
    
    # Real World Assets / Tokenization
    "rwa": {
        "LINKUSDT": SymbolInfo("LINKUSDT", "Chainlink", "rwa", "oracle", exchanges=["bybit", "binance", "coinbase", "kraken"]),
        "POLYXUSDT": SymbolInfo("POLYXUSDT", "Polymesh", "rwa", "securities", exchanges=["binance"]),
        "ONDOUSDT": SymbolInfo("ONDOUSDT", "Ondo", "rwa", "tokenization", exchanges=["bybit", "binance"]),
        "TRUUSDT": SymbolInfo("TRUUSDT", "TrueFi", "rwa", "credit", exchanges=["binance"]),
    },
    
    # Artificial Intelligence
    "ai": {
        "FETUSDT": SymbolInfo("FETUSDT", "Fetch.ai", "ai", "agents", exchanges=["bybit", "binance"]),
        "OCEANUSDT": SymbolInfo("OCEANUSDT", "Ocean Protocol", "ai", "data", exchanges=["bybit", "binance"]),
        "AGIXUSDT": SymbolInfo("AGIXUSDT", "SingularityNET", "ai", "agi", exchanges=["bybit", "binance"]),
        "TAOUSDT": SymbolInfo("TAOUSDT", "Bittensor", "ai", "ml", exchanges=["bybit", "binance"]),
        "VIRTUALUSDT": SymbolInfo("VIRTUALUSDT", "Virtuals Protocol", "ai", "gaming", exchanges=["bybit", "binance"]),
        "ICPUSDT": SymbolInfo("ICPUSDT", "Internet Computer", "ai", "compute", exchanges=["bybit", "binance", "coinbase"]),
    }
}

def get_all_symbols() -> List[str]:
    """Get all symbols across all categories"""
    all_symbols = []
    for category in SYMBOLS.values():
        all_symbols.extend(category.keys())
    return all_symbols

def get_symbols_by_category(category: str) -> List[str]:
    """Get symbols for a specific category"""
    if category in SYMBOLS:
        return list(SYMBOLS[category].keys())
    return []

def get_symbols_by_exchange(exchange: str) -> List[str]:
    """Get symbols available on a specific exchange"""
    symbols = []
    for category in SYMBOLS.values():
        for symbol, info in category.items():
            if exchange.lower() in [e.lower() for e in info.exchanges]:
                symbols.append(symbol)
    return symbols

def get_symbol_info(symbol: str) -> SymbolInfo:
    """Get detailed information about a symbol"""
    for category in SYMBOLS.values():
        if symbol in category:
            return category[symbol]
    return None

def get_exchange_symbol_format(symbol: str, exchange: str) -> str:
    """Convert symbol to exchange-specific format"""
    # Most exchanges use same format, but some differ
    if exchange.lower() == "coinbase":
        # Coinbase uses BTC-USDT format
        return symbol.replace("USDT", "-USDT")
    elif exchange.lower() == "kraken":
        # Kraken uses XBT for Bitcoin
        if symbol == "BTCUSDT":
            return "XBTUSDT"
    return symbol

# Export key lists for backward compatibility
ALL_SYMBOLS = get_all_symbols()
REFERENCE_SYMBOLS = get_symbols_by_category("reference")
ISO20022_SYMBOLS = get_symbols_by_category("iso20022")
RWA_SYMBOLS = get_symbols_by_category("rwa")
AI_SYMBOLS = get_symbols_by_category("ai")
