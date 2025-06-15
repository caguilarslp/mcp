#!/bin/bash
# Fix compilation errors script

# Fix OHLCV timestamp comparisons
sed -i 's/kline\.timestamp < startTime/parseInt(kline.timestamp) < startTime/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/kline\.timestamp > endTime/parseInt(kline.timestamp) > endTime/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/timeMap\.get(kline\.timestamp)/timeMap.get(parseInt(kline.timestamp))/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/timeMap\.set(kline\.timestamp/timeMap.set(parseInt(kline.timestamp)/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix detectTimeGaps
sed -i 's/const expectedTime = klines\[i - 1\]\.timestamp + intervalMs;/const expectedTime = parseInt(klines[i - 1].timestamp) + intervalMs;/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/const actualTime = klines\[i\]\.timestamp;/const actualTime = parseInt(klines[i].timestamp);/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix aggregateKlines return type
sed -i 's/timestamp,$/timestamp: timestamp.toString(),/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix sort function
sed -i 's/\.sort((a, b) => a\.timestamp - b\.timestamp)/\.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix price divergences - replace .last with .lastPrice
sed -i 's/data1\.ticker\.last/data1.ticker.lastPrice/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/data2\.ticker\.last/data2.ticker.lastPrice/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix structure divergences - replace .quantity with .size
sed -i 's/\.reduce((sum, bid) => sum + bid\.quantity/.reduce((sum, bid) => sum + bid.size/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/\.reduce((sum, ask) => sum + ask\.quantity/.reduce((sum, ask) => sum + ask.size/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix health status
sed -i 's/health\.status === '\''healthy'\''/health.isHealthy/g' src/adapters/exchanges/common/ExchangeAggregator.ts
sed -i 's/health\.status === '\''degraded'\''/!health.isHealthy/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix MarketTicker timestamp type
sed -i 's/const age = now - data\.ticker\.timestamp;/const age = now - parseInt(data.ticker.timestamp);/g' src/adapters/exchanges/common/ExchangeAggregator.ts

# Fix handler types
sed -i 's/data\.ticker\.last/data.ticker.lastPrice/g' src/adapters/handlers/multiExchangeHandlers.ts

echo "Fixes applied!"
