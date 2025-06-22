# Symbol Configuration Documentation

## Overview
WADM focuses on cryptocurrencies with real utility and fundamental value, organized into four main categories.

## Categories

### 1. Reference (Market Benchmarks)
Core cryptocurrencies used as market references:
- **BTC** (Bitcoin) - Digital gold, market leader
- **ETH** (Ethereum) - Smart contract platform
- **SOL** (Solana) - High-performance blockchain

### 2. ISO20022 Compliant
Cryptocurrencies aligned with ISO20022 financial messaging standards:
- **XRP** (Ripple) - Cross-border payments
- **XLM** (Stellar) - Financial inclusion
- **ALGO** (Algorand) - Central bank digital currencies
- **ADA** (Cardano) - Sustainable blockchain for financial applications
- **HBAR** (Hedera) - Enterprise DLT
- **QNT** (Quant) - Blockchain interoperability

### 3. RWA/Tokenization
Real World Asset tokenization and infrastructure:
- **LINK** (Chainlink) - Oracle network for real-world data
- **POLYX** (Polymesh) - Security token blockchain
- **ONDO** (Ondo) - Tokenized securities platform
- **TRU** (TrueFi) - Uncollateralized lending

### 4. Artificial Intelligence
AI and machine learning focused projects:
- **FET** (Fetch.ai) - Autonomous economic agents
- **OCEAN** (Ocean Protocol) - Data marketplaces
- **AGIX** (SingularityNET) - AI marketplace
- **TAO** (Bittensor) - Decentralized ML network
- **VIRTUAL** (Virtuals Protocol) - AI gaming agents
- **ICP** (Internet Computer) - Decentralized computing

## Exchange Support

### All Exchanges Now Track Same Symbols
- **Total**: 19 symbols (3 Reference + 6 ISO20022 + 4 RWA + 6 AI)
- **Format Conversion**: Handled automatically in code
  - Coinbase: Uses BTC-USDT format (with dash)
  - Kraken: Uses XBTUSDT for Bitcoin
- **Note**: Some altcoins may not be available on all exchanges, collectors will handle gracefully

### Limited Support
- **Coinbase**: 8 symbols (BTC, ETH, SOL, XRP, XLM, ALGO, LINK, ICP)
- **Kraken**: 7 symbols (BTC, ETH, SOL, XRP, XLM, ALGO, LINK)

## Usage in Code

```python
from src.symbols import (
    get_all_symbols,
    get_symbols_by_category,
    get_symbols_by_exchange,
    get_symbol_info
)

# Get all AI symbols
ai_symbols = get_symbols_by_category("ai")

# Get symbols available on Bybit
bybit_symbols = get_symbols_by_exchange("bybit")

# Get detailed info about a symbol
xrp_info = get_symbol_info("XRPUSDT")
print(f"{xrp_info.name} - {xrp_info.category}")
```

## Future Additions
We continuously monitor the market for new projects that fit our criteria:
- Strong fundamentals
- Real utility
- Institutional adoption
- No memecoins or speculative tokens

Last updated: 2025-06-21
