# ADR-001: Storage Strategy for Market Data

**Date**: 2025-06-17  
**Status**: Proposed  
**Context**: WADM Project

## Context

WADM collects high-frequency trade data from multiple exchanges. With trades coming in at potentially 1000+ per second across all symbols, storage becomes a critical concern. We need a strategy that balances:
- Query performance for real-time indicators
- Storage efficiency
- Cost effectiveness
- Data retention requirements

## Current Situation

- Raw trades: ~158 bytes per trade (MongoDB document)
- Current rate: ~1500 trades in test period
- Potential production rate: 1000+ trades/second
- Current retention: 1 hour for trades, 24 hours for indicators

## Storage Growth Estimates

At 1000 trades/second:
- Per hour: 3.6M trades = ~570 MB
- Per day: 86.4M trades = ~13.7 GB
- Per month: 2.6B trades = ~411 GB

This is clearly unsustainable for a VPS environment.

## Proposed Solution: Tiered Storage Strategy

### Tier 1: Hot Data (Real-time)
- **Duration**: Last 5 minutes
- **Storage**: MongoDB with in-memory optimization
- **Purpose**: Real-time indicator calculations
- **Format**: Raw trades

### Tier 2: Warm Data (Recent)
- **Duration**: 5 minutes to 1 hour
- **Storage**: MongoDB with aggregation
- **Purpose**: Indicator backcalculation, analysis
- **Format**: 1-second aggregated OHLCV + volume profile

### Tier 3: Cold Data (Historical)
- **Duration**: 1 hour to 7 days
- **Storage**: MongoDB compressed documents
- **Purpose**: Historical analysis, backtesting
- **Format**: 1-minute aggregated data + key indicators

### Tier 4: Archive (Long-term)
- **Duration**: 7+ days
- **Storage**: File-based (Parquet/CSV compressed)
- **Purpose**: Long-term storage, research
- **Format**: Hourly aggregated data

## Implementation Strategy

### Phase 1: Aggregation Pipeline
1. Create aggregation workers
2. Implement 1-second OHLCV aggregation
3. Add volume profile snapshots per minute
4. Store key indicator values

### Phase 2: Compression
1. Implement document compression for warm data
2. Use MongoDB compression features
3. Create efficient indexes for common queries

### Phase 3: Archival System
1. Implement file-based archival (Parquet)
2. Create restoration mechanism
3. Build query layer for archived data

## Data Retention Policy

- **Raw trades**: 5 minutes (hot) → Deleted
- **1-sec aggregated**: 1 hour → Compressed to 1-min
- **1-min aggregated**: 24 hours → Compressed to 1-hour
- **1-hour aggregated**: 7 days → Archived to files
- **Indicators**: 7 days in MongoDB → Archived

## Storage Savings

With this strategy:
- Hot tier: ~50 MB (5 min of raw trades)
- Warm tier: ~200 MB (1 hour of 1-sec aggregated)
- Cold tier: ~2 GB (7 days of 1-min aggregated)
- Total MongoDB: ~2.3 GB vs 96 GB (raw trades for 7 days)

## Consequences

### Positive
- 97% reduction in storage requirements
- Better query performance on aggregated data
- Scalable to more symbols
- Cost-effective for VPS deployment

### Negative
- Loss of tick-level granularity after 5 minutes
- Additional complexity in aggregation logic
- Need to maintain multiple data formats
- Potential data loss if aggregation fails

## Alternatives Considered

1. **Keep only indicators**: Too limiting for analysis
2. **External time-series DB**: Additional complexity
3. **Cloud storage**: Latency and cost concerns
4. **Larger retention of raw data**: Not sustainable

## Decision

Implement the tiered storage strategy starting with Phase 1 (aggregation pipeline) after fixing current indicator calculations.

## References
- MongoDB Aggregation Pipeline
- Apache Parquet for time-series data
- Time-series data best practices
