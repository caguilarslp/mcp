# WADM Indicator Specifications

## Core Philosophy
All indicators are designed to reveal institutional activity and Smart Money movements based on Wyckoff principles and modern order flow analysis.

## 1. Volume Profile Enhancement

### Purpose
Identify where institutions have positioned themselves through volume concentration analysis.

### Components
- **TPO (Time Price Opportunity)**: Count of time periods at each price
- **Dynamic Value Area**: Real-time calculation of 70% volume concentration
- **Session Profiles**: Separate profiles for Asian, London, NY sessions
- **Naked POC**: Unvisited Points of Control from previous sessions
- **Delta Profile**: Buy vs Sell volume at each price level

### Key Insights
- POC acts as a magnet in balanced markets
- Naked POCs are high-probability revisit targets
- Value Area edges often act as support/resistance

## 2. Advanced Order Flow Analysis

### Purpose
Detect real-time supply/demand imbalances and institutional positioning.

### Components
- **Exhaustion Detection**: High volume with no price progress
- **Momentum Calculation**: Rate of change in order flow
- **Stop Run Detection**: Rapid price movement with volume spike
- **Level Imbalances**: Bid/ask imbalance at specific prices
- **Trade Intensity**: Trades per second with size analysis

### Key Insights
- Exhaustion often precedes reversals
- Stop runs indicate liquidity grabs
- Persistent imbalances show institutional interest

## 3. VWAP (Volume Weighted Average Price)

### Purpose
Identify the average price where most volume has traded - institutional fair value.

### Components
- **Standard VWAP**: From session open
- **Deviation Bands**: 1σ, 2σ, 3σ bands
- **Anchored VWAP**: From significant highs/lows
- **Rolling VWAP**: Continuous N-period VWAP
- **Multi-timeframe VWAP**: Daily, Weekly, Monthly

### Key Insights
- Price above VWAP = bullish bias
- 2σ bands often contain 95% of price action
- Anchored VWAP from highs acts as resistance

## 4. Market Structure Analysis

### Purpose
Identify the current phase of market action per Wyckoff methodology.

### Components
- **Swing Detection**: Algorithmic high/low identification
- **Phase Recognition**: Accumulation, Markup, Distribution, Markdown
- **Trend Structure**: Higher Highs/Lows tracking
- **Spring/Upthrust**: False breakout detection
- **Structure Levels**: Key support/resistance from structure

### Key Insights
- Springs often mark the end of accumulation
- Failed new highs (upthrust) signal distribution
- Structure breaks confirm phase transitions

## 5. Liquidity Map

### Purpose
Map where resting liquidity exists and where price is likely to be drawn.

### Components
- **High Volume Nodes (HVN)**: Price acceptance areas
- **Low Volume Nodes (LVN)**: Price rejection areas
- **Unmitigated Order Blocks**: Institutional supply/demand zones
- **Liquidity Pools**: Stop loss clusters
- **Magnetic Levels**: Prices that attract market activity

### Key Insights
- Price moves from liquidity pool to liquidity pool
- LVNs often see rapid price movement
- Unmitigated order blocks act as magnets

## 6. Smart Money Footprint

### Purpose
Detect and track institutional player activity patterns.

### Components
- **Iceberg Detection**: Large orders hidden in small prints
- **Absorption Analysis**: Supply/demand absorption at levels
- **Accumulation/Distribution**: Position building patterns
- **VSA Integration**: Volume Spread Analysis
- **Effort vs Result**: Volume vs price movement analysis

### Key Insights
- Icebergs indicate institutional interest
- Absorption precedes major moves
- Low volume rises = lack of selling pressure

## 7. Time-Based Volume Accumulation

### Purpose
Track how volume accumulates over time to identify unusual activity.

### Components
- **CVD (Cumulative Volume Delta)**: Running buy-sell difference
- **Volume Rate of Change**: Acceleration/deceleration
- **Relative Volume**: Current vs average for time of day
- **Volume Weighted Momentum**: Price momentum weighted by volume
- **Profile Migration**: How volume distribution changes

### Key Insights
- CVD divergence from price indicates reversal
- Unusual volume precedes volatility
- Volume migration shows institutional repositioning

## 8. Delta Divergence Analysis

### Purpose
Identify when buying/selling pressure diverges from price action.

### Components
- **Price/Delta Divergence**: Price up, delta down = bearish
- **Delta Momentum**: Rate of change in delta
- **Cumulative Delta Patterns**: Reset and continuation patterns
- **Delta Absorption**: High delta, no price movement
- **Multi-timeframe Delta**: Confluence across timeframes

### Key Insights
- Divergences mark potential reversals
- Delta absorption shows hidden supply/demand
- Multi-timeframe alignment increases probability

## 9. Footprint Charts

### Purpose
Microscopic view of order flow showing bid/ask volume at each price and time.

### Components
- **Bid/Ask Imbalance**: Diagonal imbalance patterns
- **Stacked Imbalances**: Multiple imbalances in sequence
- **Volume Clusters**: High activity cells
- **Absorption Patterns**: High volume, no price progress
- **Initiative vs Responsive**: Who's driving the market

### Key Insights
- Stacked imbalances show strong directional intent
- Absorption at extremes marks reversals
- Initiative activity leads price direction

## 10. Market Profile Letters

### Purpose
Traditional Market Profile analysis showing time distribution at price.

### Components
- **TPO Letters**: Half-hour periods labeled A-Z
- **Profile Shapes**: Normal, b-shaped, p-shaped, etc.
- **Initial Balance**: First hour's range
- **Range Extension**: Movement beyond IB
- **Single Prints**: Prices visited only once

### Key Insights
- IB often contains 70% of day's volume
- Single prints get revisited 80% of time
- Profile shape indicates day type

## Implementation Priority

1. **Critical**: Fix current Volume Profile & Order Flow
2. **High**: VWAP, Market Structure, enhanced Order Flow
3. **Medium**: Liquidity Map, Smart Money Footprint, Time Volume
4. **Low**: Footprint Charts, Market Profile Letters

Each indicator will be designed to work both independently and in confluence with others, providing a complete picture of market dynamics from an institutional perspective.
