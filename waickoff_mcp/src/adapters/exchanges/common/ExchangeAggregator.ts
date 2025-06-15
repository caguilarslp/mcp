/**
 * @fileoverview Exchange Aggregator Service - TASK-026 FASE 2
 * @description Intelligent aggregation of data from multiple exchanges
 * @version 1.0.0
 */

import {
  MarketTicker,
  Orderbook,
  OHLCV,
  MarketCategoryType
} from '../../../types/index.js';

import {
  IExchangeAdapter,
  ExchangeHealth
} from './IExchangeAdapter.js';

import {
  AggregatedTicker,
  CompositeOrderbook,
  SynchronizedKlines,
  ExchangeDivergence,
  ArbitrageOpportunity,
  AggregationConfig,
  ExchangeDominance,
  ExchangeCorrelation,
  MultiExchangeAnalytics
} from './types.js';

import { EngineError } from '../../../core/index.js';
import { ILogger } from '../../../utils/logger.js';
import { createLogger } from '../../../utils/logger.js';

/**
 * Exchange Aggregator Service
 * Combines data from multiple exchanges with intelligent weighting and conflict resolution
 */
export class ExchangeAggregator {
  private logger: ILogger;
  private adapters: Map<string, IExchangeAdapter>;
  private weights: Map<string, number>;
  private config: AggregationConfig;
  private healthCache: Map<string, ExchangeHealth>;
  private dominanceCache: Map<string, ExchangeDominance>;

  constructor(
    adapters: Map<string, IExchangeAdapter>,
    config?: Partial<AggregationConfig>
  ) {
    this.logger = createLogger('ExchangeAggregator');
    this.adapters = adapters;
    this.weights = new Map();
    this.healthCache = new Map();
    this.dominanceCache = new Map();
    
    // Initialize default config
    this.config = this.mergeConfig(config);
    
    // Initialize weights from config
    this.initializeWeights();
    
    this.logger.info('ExchangeAggregator initialized', {
      exchanges: Array.from(adapters.keys()),
      weights: Object.fromEntries(this.weights)
    });
  }

  /**
   * Get aggregated ticker data with weighted pricing
   */
  async getAggregatedTicker(
    symbol: string,
    category: MarketCategoryType = 'spot'
  ): Promise<AggregatedTicker> {
    const exchanges: AggregatedTicker['exchanges'] = {};
    const prices: number[] = [];
    const volumes: number[] = [];
    const weights: number[] = [];
    const startTime = Date.now();

    // Fetch ticker from all healthy exchanges
    const healthyAdapters = await this.getHealthyAdapters();
    
    if (healthyAdapters.length === 0) {
      throw new EngineError('AGGREGATOR_ERROR', 'No healthy exchanges available');
    }

    const tickerPromises = healthyAdapters.map(async ({ name, adapter }) => {
      try {
        const ticker = await adapter.getTicker(symbol, category);
        const weight = this.weights.get(name) || 0.5;
        
        exchanges[name] = {
          ticker,
          weight,
          responseTime: Date.now() - startTime
        };

        prices.push(ticker.lastPrice);
        volumes.push(ticker.volume24h);
        weights.push(weight);

        return { name, ticker, weight };
      } catch (error) {
        this.logger.warn(`Failed to get ticker from ${name}`, { error });
        return null;
      }
    });

    const results = (await Promise.all(tickerPromises)).filter(Boolean);
    
    if (results.length === 0) {
      throw new EngineError('AGGREGATOR_ERROR', 'Failed to get ticker from any exchange');
    }

    // Calculate weighted average price
    const weightedPrice = this.calculateWeightedAverage(prices, weights);
    
    // Calculate price deviation
    const priceDeviation = this.calculateStandardDeviation(prices);
    
    // Calculate total volume
    const volumeTotal = volumes.reduce((sum, vol) => sum + vol, 0);
    
    // Calculate price range
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      spread: ((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100
    };

    // Calculate confidence based on consistency
    const confidence = this.calculateConfidence(prices, volumes, weights);

    // Use the first ticker as base (could be improved)
    const baseTicker = results[0]!.ticker;

    return {
      ...baseTicker,
      exchanges,
      weightedPrice,
      priceDeviation,
      volumeTotal,
      priceRange,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get composite orderbook from multiple exchanges
   */
  async getCompositeOrderbook(
    symbol: string,
    category: MarketCategoryType = 'spot',
    limit: number = 25
  ): Promise<CompositeOrderbook> {
    const exchanges: CompositeOrderbook['exchanges'] = {};
    const allBids: Array<{ price: number; quantity: number; exchange: string }> = [];
    const allAsks: Array<{ price: number; quantity: number; exchange: string }> = [];
    
    const healthyAdapters = await this.getHealthyAdapters();
    
    const orderbookPromises = healthyAdapters.map(async ({ name, adapter }) => {
      try {
        const orderbook = await adapter.getOrderbook(symbol, category, limit);
        const weight = this.weights.get(name) || 0.5;
        
        // Add exchange info to each order
        orderbook.bids.forEach(bid => {
          allBids.push({ price: bid.price, quantity: bid.size, exchange: name });
        });
        
        orderbook.asks.forEach(ask => {
          allAsks.push({ price: ask.price, quantity: ask.size, exchange: name });
        });

        exchanges[name] = {
          orderbook,
          weight,
          contribution: 0 // Will calculate after aggregation
        };

        return { name, orderbook, weight };
      } catch (error) {
        this.logger.warn(`Failed to get orderbook from ${name}`, { error });
        return null;
      }
    });

    const results = (await Promise.all(orderbookPromises)).filter(Boolean);
    
    if (results.length === 0) {
      throw new EngineError('AGGREGATOR_ERROR', 'Failed to get orderbook from any exchange');
    }

    // Sort and aggregate orders
    allBids.sort((a, b) => b.price - a.price); // Descending
    allAsks.sort((a, b) => a.price - b.price); // Ascending

    // Aggregate orders at same price levels
    const aggregatedBids = this.aggregateOrders(allBids.slice(0, limit));
    const aggregatedAsks = this.aggregateOrders(allAsks.slice(0, limit));

    // Calculate total volumes
    const totalBidVolume = aggregatedBids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = aggregatedAsks.reduce((sum, ask) => sum + ask.quantity, 0);

    // Calculate contribution percentages
    for (const [exchange, data] of Object.entries(exchanges)) {
      const bidVolume = data.orderbook.bids.reduce((sum, bid) => sum + bid.size, 0);
      const askVolume = data.orderbook.asks.reduce((sum, ask) => sum + ask.size, 0);
      const totalVolume = bidVolume + askVolume;
      const totalAggregatedVolume = totalBidVolume + totalAskVolume;
      data.contribution = totalAggregatedVolume > 0 ? (totalVolume / totalAggregatedVolume) * 100 : 0;
    }

    // Calculate weighted spread
    const bestBid = aggregatedBids[0]?.price || 0;
    const bestAsk = aggregatedAsks[0]?.price || 0;
    const weightedSpread = bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 100 : 0;

    // Calculate liquidity score
    const liquidityScore = this.calculateLiquidityScore(totalBidVolume, totalAskVolume, weightedSpread);

    // Detect arbitrage opportunities
    const arbitrageOpportunities = this.detectArbitrageInOrderbook(allBids, allAsks, symbol);

    const baseOrderbook: Orderbook = {
      symbol,
      bids: aggregatedBids.map(b => ({ price: b.price, size: b.quantity })),
      asks: aggregatedAsks.map(a => ({ price: a.price, size: a.quantity })),
      timestamp: Date.now().toString(),
      spread: weightedSpread
    };

    return {
      ...baseOrderbook,
      exchanges,
      aggregatedDepth: {
        totalBidVolume,
        totalAskVolume,
        weightedSpread,
        liquidityScore
      },
      arbitrageOpportunities,
      timestamp: new Date().toISOString()
    } as CompositeOrderbook;
  }

  /**
   * Get synchronized klines across exchanges
   */
  async getSynchronizedKlines(
    symbol: string,
    interval: string,
    limit: number = 100,
    category: MarketCategoryType = 'spot'
  ): Promise<SynchronizedKlines> {
    const exchanges: SynchronizedKlines['exchanges'] = {};
    const synchronizationGaps: SynchronizedKlines['synchronizationGaps'] = {};
    
    const healthyAdapters = await this.getHealthyAdapters();
    
    const klinesPromises = healthyAdapters.map(async ({ name, adapter }) => {
      try {
        const klines = await adapter.getKlines(symbol, interval, limit, category);
        const weight = this.weights.get(name) || 0.5;
        const dataQuality = this.calculateDataQuality(klines, limit);
        
        exchanges[name] = {
          klines,
          weight,
          dataQuality
        };

        return { name, klines, weight };
      } catch (error) {
        this.logger.warn(`Failed to get klines from ${name}`, { error });
        return null;
      }
    });

    const results = (await Promise.all(klinesPromises)).filter(Boolean);
    
    if (results.length === 0) {
      throw new EngineError('AGGREGATOR_ERROR', 'Failed to get klines from any exchange');
    }

    // Find common time range
    const timeRanges = results.map(r => ({
      start: Math.min(...r!.klines.map(k => parseInt(k.timestamp))),
      end: Math.max(...r!.klines.map(k => parseInt(k.timestamp)))
    }));

    const commonStart = Math.max(...timeRanges.map(r => r.start));
    const commonEnd = Math.min(...timeRanges.map(r => r.end));

    // Synchronize and aggregate klines
    const aggregatedKlines = this.aggregateKlines(results, commonStart, commonEnd);

    // Detect synchronization gaps
    for (const result of results) {
      const gaps = this.detectTimeGaps(result!.klines, interval);
      const lag = Date.now() - Math.max(...result!.klines.map(k => parseInt(k.timestamp)));
      
      synchronizationGaps[result!.name] = {
        missingPeriods: gaps,
        dataLag: lag
      };
    }

    // Calculate overall confidence
    const confidence = this.calculateSynchronizationConfidence(exchanges, synchronizationGaps);

    return {
      symbol,
      interval,
      exchanges,
      aggregatedKlines,
      synchronizationGaps,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detect divergences between exchanges
   */
  async detectDivergences(
    symbol: string,
    category: MarketCategoryType = 'spot'
  ): Promise<ExchangeDivergence[]> {
    const divergences: ExchangeDivergence[] = [];
    
    try {
      // Get aggregated data
      const ticker = await this.getAggregatedTicker(symbol, category);
      const orderbook = await this.getCompositeOrderbook(symbol, category, 10);
      
      // Price divergences
      const priceDivergences = this.detectPriceDivergences(ticker);
      divergences.push(...priceDivergences);
      
      // Volume divergences
      const volumeDivergences = this.detectVolumeDivergences(ticker);
      divergences.push(...volumeDivergences);
      
      // Structure divergences (orderbook imbalances)
      const structureDivergences = this.detectStructureDivergences(orderbook);
      divergences.push(...structureDivergences);
      
      return divergences;
    } catch (error) {
      this.logger.error('Failed to detect divergences', { error });
      return [];
    }
  }

  /**
   * Identify arbitrage opportunities
   */
  async identifyArbitrage(
    symbol: string,
    category: MarketCategoryType = 'spot'
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      const ticker = await this.getAggregatedTicker(symbol, category);
      const orderbook = await this.getCompositeOrderbook(symbol, category, 5);
      
      // Simple price arbitrage
      const priceArbitrage = this.detectPriceArbitrage(ticker, symbol);
      opportunities.push(...priceArbitrage);
      
      // Orderbook arbitrage (cross-exchange)
      const orderbookArbitrage = orderbook.arbitrageOpportunities;
      opportunities.push(...orderbookArbitrage);
      
      return opportunities;
    } catch (error) {
      this.logger.error('Failed to identify arbitrage', { error });
      return [];
    }
  }

  /**
   * Get exchange dominance metrics
   */
  async getExchangeDominance(
    symbol: string,
    timeframe: string = '1h'
  ): Promise<ExchangeDominance> {
    // Check cache first
    const cacheKey = `${symbol}_${timeframe}`;
    const cached = this.dominanceCache.get(cacheKey);
    if (cached && Date.now() - new Date(cached.timestamp).getTime() < 60000) {
      return cached;
    }

    const dominanceByExchange: ExchangeDominance['dominanceByExchange'] = {};
    
    try {
      const ticker = await this.getAggregatedTicker(symbol);
      
      // Calculate dominance metrics for each exchange
      let totalVolume = 0;
      const volumes: Map<string, number> = new Map();
      
      for (const [exchange, data] of Object.entries(ticker.exchanges)) {
        const volume = data.ticker.volume24h;
        volumes.set(exchange, volume);
        totalVolume += volume;
      }

      // Calculate shares and influence
      for (const [exchange, volume] of volumes) {
        const volumeShare = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
        const priceInfluence = (this.weights.get(exchange) || 0.5) * 100;
        
        dominanceByExchange[exchange] = {
          volumeShare,
          priceInfluence,
          liquidityShare: volumeShare, // Simplified for now
          momentumLeadership: priceInfluence // Simplified for now
        };
      }

      // Determine market leader
      const marketLeader = Array.from(volumes.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      // Calculate volume migration (simplified)
      const volumeMigration = {
        trend: 'stable' as const,
        rate: 0,
        direction: marketLeader
      };

      // Institutional preference (simplified - based on volume)
      const institutionalPreference: { [key: string]: number } = {};
      for (const [exchange, share] of Object.entries(dominanceByExchange)) {
        institutionalPreference[exchange] = Math.min(share.volumeShare * 1.5, 100);
      }

      const dominance: ExchangeDominance = {
        symbol,
        timeframe,
        dominanceByExchange,
        marketLeader,
        volumeMigration,
        institutionalPreference,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.dominanceCache.set(cacheKey, dominance);
      
      return dominance;
    } catch (error) {
      this.logger.error('Failed to calculate exchange dominance', { error });
      throw error;
    }
  }

  /**
   * Get complete multi-exchange analytics
   */
  async getMultiExchangeAnalytics(
    symbol: string,
    timeframe: string = '1h'
  ): Promise<MultiExchangeAnalytics> {
    try {
      // Gather all data
      const [
        aggregatedTicker,
        compositeOrderbook,
        synchronizedKlines,
        dominance,
        divergences,
        arbitrageOpportunities
      ] = await Promise.all([
        this.getAggregatedTicker(symbol),
        this.getCompositeOrderbook(symbol),
        this.getSynchronizedKlines(symbol, timeframe, 100),
        this.getExchangeDominance(symbol, timeframe),
        this.detectDivergences(symbol),
        this.identifyArbitrage(symbol)
      ]);

      // Calculate correlation
      const correlation = this.calculateExchangeCorrelation(
        symbol,
        timeframe,
        synchronizedKlines
      );

      // Calculate data quality metrics
      const dataQuality = {
        completeness: this.calculateCompleteness(synchronizedKlines),
        consistency: aggregatedTicker.confidence,
        timeliness: this.calculateTimeliness(aggregatedTicker),
        reliability: this.calculateReliability(aggregatedTicker, synchronizedKlines)
      };

      return {
        symbol,
        timeframe,
        aggregatedTicker,
        compositeOrderbook,
        synchronizedKlines,
        dominance,
        correlation,
        arbitrageOpportunities,
        divergences,
        dataQuality,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to generate multi-exchange analytics', { error });
      throw error;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private mergeConfig(config?: Partial<AggregationConfig>): AggregationConfig {
    return {
      weights: config?.weights || {
        binance: 0.6,
        bybit: 0.4
      },
      qualityThresholds: {
        minResponseTime: 1000,
        maxErrorRate: 5,
        minDataCompleteness: 80,
        ...config?.qualityThresholds
      },
      arbitrageDetection: {
        enabled: true,
        minSpread: 0.1,
        maxLatency: 5000,
        ...config?.arbitrageDetection
      },
      divergenceTracking: {
        enabled: true,
        priceThreshold: 0.5,
        volumeThreshold: 20,
        durationThreshold: 5,
        ...config?.divergenceTracking
      },
      healthMonitoring: {
        checkInterval: 30,
        failureThreshold: 3,
        recoveryThreshold: 2,
        ...config?.healthMonitoring
      }
    };
  }

  private initializeWeights(): void {
    for (const [exchange, weight] of Object.entries(this.config.weights)) {
      this.weights.set(exchange, weight);
    }
  }

  private async getHealthyAdapters(): Promise<Array<{ name: string; adapter: IExchangeAdapter }>> {
    const healthy: Array<{ name: string; adapter: IExchangeAdapter }> = [];
    
    for (const [name, adapter] of this.adapters) {
      try {
        const health = await adapter.healthCheck();
        this.healthCache.set(name, health);
        
        if (health.isHealthy && 
            health.latency < this.config.qualityThresholds.minResponseTime &&
            health.errorRate < this.config.qualityThresholds.maxErrorRate) {
          healthy.push({ name, adapter });
        }
      } catch (error) {
        this.logger.warn(`Failed to check health for ${name}`, { error });
      }
    }
    
    return healthy;
  }

  private calculateWeightedAverage(values: number[], weights: number[]): number {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;
    
    let weightedSum = 0;
    for (let i = 0; i < values.length; i++) {
      weightedSum += values[i] * weights[i];
    }
    
    return weightedSum / totalWeight;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateConfidence(prices: number[], volumes: number[], weights: number[]): number {
    // Base confidence on price consistency and volume distribution
    const priceDeviation = this.calculateStandardDeviation(prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const priceConsistency = avgPrice > 0 ? 100 - (priceDeviation / avgPrice) * 100 : 0;
    
    // Volume consistency
    const volumeDeviation = this.calculateStandardDeviation(volumes);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const volumeConsistency = avgVolume > 0 ? 100 - (volumeDeviation / avgVolume) * 100 : 0;
    
    // Weight distribution (higher is better)
    const weightBalance = 100 - this.calculateStandardDeviation(weights) * 100;
    
    // Combined confidence
    const confidence = (priceConsistency * 0.5 + volumeConsistency * 0.3 + weightBalance * 0.2);
    
    return Math.max(0, Math.min(100, confidence));
  }

  private aggregateOrders(
    orders: Array<{ price: number; quantity: number; exchange: string }>
  ): Array<{ price: number; quantity: number }> {
    const aggregated = new Map<number, number>();
    
    for (const order of orders) {
      const existing = aggregated.get(order.price) || 0;
      aggregated.set(order.price, existing + order.quantity);
    }
    
    return Array.from(aggregated.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price); // For bids; reverse for asks
  }

  private calculateLiquidityScore(
    bidVolume: number,
    askVolume: number,
    spread: number
  ): number {
    // Higher volume and lower spread = better liquidity
    const volumeScore = Math.log10(bidVolume + askVolume + 1) * 10;
    const balanceScore = 100 - Math.abs(bidVolume - askVolume) / (bidVolume + askVolume) * 100;
    const spreadScore = Math.max(0, 100 - spread * 100);
    
    return (volumeScore * 0.4 + balanceScore * 0.3 + spreadScore * 0.3);
  }

  private detectArbitrageInOrderbook(
    allBids: Array<{ price: number; quantity: number; exchange: string }>,
    allAsks: Array<{ price: number; quantity: number; exchange: string }>,
    symbol: string
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Group by exchange
    const bidsByExchange = new Map<string, number>();
    const asksByExchange = new Map<string, number>();
    
    for (const bid of allBids) {
      const current = bidsByExchange.get(bid.exchange) || 0;
      bidsByExchange.set(bid.exchange, Math.max(current, bid.price));
    }
    
    for (const ask of allAsks) {
      const current = asksByExchange.get(ask.exchange) || Infinity;
      asksByExchange.set(ask.exchange, Math.min(current, ask.price));
    }
    
    // Check for arbitrage opportunities
    for (const [buyExchange, buyPrice] of asksByExchange) {
      for (const [sellExchange, sellPrice] of bidsByExchange) {
        if (buyExchange === sellExchange) continue;
        
        const spread = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        if (spread > this.config.arbitrageDetection.minSpread) {
          // Estimate fees (simplified)
          const buyFee = 0.1; // 0.1%
          const sellFee = 0.1; // 0.1%
          const totalFees = buyFee + sellFee;
          const potentialProfit = spread - totalFees;
          
          if (potentialProfit > 0) {
            opportunities.push({
              type: 'price',
              buyExchange,
              sellExchange,
              symbol,
              buyPrice,
              sellPrice,
              spread,
              potentialProfit,
              volume: 0, // Would need order depth analysis
              timeWindow: 60, // Estimated
              confidence: Math.min(spread * 10, 100),
              riskLevel: spread > 1 ? 'low' : spread > 0.5 ? 'medium' : 'high',
              fees: {
                buyFee,
                sellFee,
                totalFees
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
    
    return opportunities;
  }

  private calculateDataQuality(klines: OHLCV[], expectedCount: number): number {
    const actualCount = klines.length;
    const completeness = (actualCount / expectedCount) * 100;
    
    // Check for gaps
    let gaps = 0;
    for (let i = 1; i < klines.length; i++) {
      const expectedGap = parseInt(klines[i].timestamp) - parseInt(klines[i - 1].timestamp);
      if (expectedGap > 86400000) { // More than 1 day gap
        gaps++;
      }
    }
    
    const continuity = 100 - (gaps / actualCount) * 100;
    
    return (completeness * 0.7 + continuity * 0.3);
  }

  private aggregateKlines(
    results: Array<{ name: string; klines: OHLCV[]; weight: number } | null>,
    startTime: number,
    endTime: number
  ): OHLCV[] {
    const timeMap = new Map<number, {
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
      weights: number[];
    }>();

    // Group klines by timestamp
    for (const result of results) {
      if (!result) continue;
      
      for (const kline of result.klines) {
        if (parseInt(kline.timestamp) < startTime || parseInt(kline.timestamp) > endTime) continue;
        
        const timestampNum = parseInt(kline.timestamp);
        let data = timeMap.get(timestampNum);
        if (!data) {
          data = {
            open: [],
            high: [],
            low: [],
            close: [],
            volume: [],
            weights: []
          };
          timeMap.set(timestampNum, data);
        }
        
        data.open.push(kline.open);
        data.high.push(kline.high);
        data.low.push(kline.low);
        data.close.push(kline.close);
        data.volume.push(kline.volume);
        data.weights.push(result.weight);
      }
    }

    // Aggregate klines
    const aggregated: OHLCV[] = [];
    
    for (const [timestamp, data] of timeMap) {
      aggregated.push({
        timestamp: timestamp.toString(),
        open: this.calculateWeightedAverage(data.open, data.weights),
        high: Math.max(...data.high),
        low: Math.min(...data.low),
        close: this.calculateWeightedAverage(data.close, data.weights),
        volume: data.volume.reduce((sum, v) => sum + v, 0)
      });
    }
    
    return aggregated.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
  }

  private detectTimeGaps(klines: OHLCV[], interval: string): string[] {
    const gaps: string[] = [];
    const intervalMs = this.getIntervalMilliseconds(interval);
    
    for (let i = 1; i < klines.length; i++) {
      const expectedTime = parseInt(klines[i - 1].timestamp) + intervalMs;
      const actualTime = parseInt(klines[i].timestamp);
      
      if (actualTime - expectedTime > intervalMs * 1.5) {
        gaps.push(new Date(expectedTime).toISOString());
      }
    }
    
    return gaps;
  }

  private getIntervalMilliseconds(interval: string): number {
    const intervals: { [key: string]: number } = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };
    
    return intervals[interval] || 3600000;
  }

  private calculateSynchronizationConfidence(
    exchanges: SynchronizedKlines['exchanges'],
    gaps: SynchronizedKlines['synchronizationGaps']
  ): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [exchange, data] of Object.entries(exchanges)) {
      const gapData = gaps[exchange];
      const qualityScore = data.dataQuality;
      const gapScore = 100 - (gapData.missingPeriods.length * 5);
      const lagScore = 100 - Math.min(gapData.dataLag / 60000, 100); // Penalty for lag
      
      const score = (qualityScore * 0.5 + gapScore * 0.3 + lagScore * 0.2);
      totalScore += score * data.weight;
      totalWeight += data.weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private detectPriceDivergences(ticker: AggregatedTicker): ExchangeDivergence[] {
    const divergences: ExchangeDivergence[] = [];
    const threshold = this.config.divergenceTracking.priceThreshold;
    
    for (const [exchange1, data1] of Object.entries(ticker.exchanges)) {
      for (const [exchange2, data2] of Object.entries(ticker.exchanges)) {
        if (exchange1 === exchange2) continue;
        
        const priceDiff = Math.abs(data1.ticker.lastPrice - data2.ticker.lastPrice);
        const priceDiffPercent = (priceDiff / Math.min(data1.ticker.lastPrice, data2.ticker.lastPrice)) * 100;
        
        if (priceDiffPercent > threshold) {
          const leadExchange = data1.ticker.lastPrice > data2.ticker.lastPrice ? exchange1 : exchange2;
          const lagExchange = leadExchange === exchange1 ? exchange2 : exchange1;
          
          divergences.push({
            type: 'price',
            symbol: ticker.symbol,
            leadExchange,
            lagExchange,
            magnitude: priceDiffPercent,
            duration: 0, // Would need historical data
            opportunity: priceDiffPercent > 1 ? 'arbitrage' : 'momentum',
            confidence: Math.min(priceDiffPercent * 20, 100),
            riskLevel: priceDiffPercent > 2 ? 'high' : priceDiffPercent > 1 ? 'medium' : 'low',
            priceTarget: (data1.ticker.lastPrice + data2.ticker.lastPrice) / 2,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return divergences;
  }

  private detectVolumeDivergences(ticker: AggregatedTicker): ExchangeDivergence[] {
    const divergences: ExchangeDivergence[] = [];
    const threshold = this.config.divergenceTracking.volumeThreshold;
    
    const avgVolume = ticker.volumeTotal / Object.keys(ticker.exchanges).length;
    
    for (const [exchange, data] of Object.entries(ticker.exchanges)) {
      const volumeDiffPercent = Math.abs(data.ticker.volume24h - avgVolume) / avgVolume * 100;
      
      if (volumeDiffPercent > threshold) {
        const otherExchange = Object.keys(ticker.exchanges).find(e => e !== exchange) || exchange;
        
        divergences.push({
          type: 'volume',
          symbol: ticker.symbol,
          leadExchange: data.ticker.volume24h > avgVolume ? exchange : otherExchange,
          lagExchange: data.ticker.volume24h > avgVolume ? otherExchange : exchange,
          magnitude: volumeDiffPercent,
          duration: 0,
          opportunity: volumeDiffPercent > 50 ? 'momentum' : 'none',
          confidence: Math.min(volumeDiffPercent, 100),
          riskLevel: volumeDiffPercent > 100 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return divergences;
  }

  private detectStructureDivergences(orderbook: CompositeOrderbook): ExchangeDivergence[] {
    const divergences: ExchangeDivergence[] = [];
    
    // Analyze bid/ask imbalances across exchanges
    for (const [exchange, data] of Object.entries(orderbook.exchanges)) {
      const bidVolume = data.orderbook.bids.reduce((sum, bid) => sum + bid.size, 0);
      const askVolume = data.orderbook.asks.reduce((sum, ask) => sum + ask.size, 0);
      const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume) * 100;
      
      if (Math.abs(imbalance) > 30) {
        const otherExchange = Object.keys(orderbook.exchanges).find(e => e !== exchange) || exchange;
        
        divergences.push({
          type: 'structure',
          symbol: orderbook.symbol,
          leadExchange: imbalance > 0 ? exchange : otherExchange,
          lagExchange: imbalance > 0 ? otherExchange : exchange,
          magnitude: Math.abs(imbalance),
          duration: 0,
          opportunity: Math.abs(imbalance) > 50 ? 'reversal' : 'none',
          confidence: Math.min(Math.abs(imbalance), 100),
          riskLevel: Math.abs(imbalance) > 70 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return divergences;
  }

  private detectPriceArbitrage(
    ticker: AggregatedTicker,
    symbol: string
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    for (const [exchange1, data1] of Object.entries(ticker.exchanges)) {
      for (const [exchange2, data2] of Object.entries(ticker.exchanges)) {
        if (exchange1 === exchange2) continue;
        
        const spread = ((data2.ticker.lastPrice - data1.ticker.lastPrice) / data1.ticker.lastPrice) * 100;
        
        if (spread > this.config.arbitrageDetection.minSpread) {
          const buyFee = 0.1;
          const sellFee = 0.1;
          const totalFees = buyFee + sellFee;
          const potentialProfit = spread - totalFees;
          
          if (potentialProfit > 0) {
            opportunities.push({
              type: 'price',
              buyExchange: exchange1,
              sellExchange: exchange2,
              symbol,
              buyPrice: data1.ticker.lastPrice,
              sellPrice: data2.ticker.lastPrice,
              spread,
              potentialProfit,
              volume: Math.min(data1.ticker.volume24h, data2.ticker.volume24h) * 0.001,
              timeWindow: 300,
              confidence: Math.min(spread * 20, 100),
              riskLevel: spread > 1 ? 'low' : 'medium',
              fees: {
                buyFee,
                sellFee,
                totalFees
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
    
    return opportunities;
  }

  private calculateExchangeCorrelation(
    symbol: string,
    timeframe: string,
    klines: SynchronizedKlines
  ): ExchangeCorrelation {
    const correlationMatrix: ExchangeCorrelation['correlationMatrix'] = {};
    const exchanges = Object.keys(klines.exchanges);
    
    // Calculate correlation between each pair of exchanges
    for (const exchange1 of exchanges) {
      correlationMatrix[exchange1] = {};
      
      for (const exchange2 of exchanges) {
        if (exchange1 === exchange2) {
          correlationMatrix[exchange1][exchange2] = {
            priceCorrelation: 1,
            volumeCorrelation: 1,
            timeLag: 0,
            strength: 'strong'
          };
          continue;
        }
        
        const prices1 = klines.exchanges[exchange1].klines.map(k => k.close);
        const prices2 = klines.exchanges[exchange2].klines.map(k => k.close);
        const volumes1 = klines.exchanges[exchange1].klines.map(k => k.volume);
        const volumes2 = klines.exchanges[exchange2].klines.map(k => k.volume);
        
        const priceCorrelation = this.calculateCorrelation(prices1, prices2);
        const volumeCorrelation = this.calculateCorrelation(volumes1, volumes2);
        
        correlationMatrix[exchange1][exchange2] = {
          priceCorrelation,
          volumeCorrelation,
          timeLag: 0, // Simplified
          strength: priceCorrelation > 0.8 ? 'strong' : priceCorrelation > 0.5 ? 'moderate' : 'weak'
        };
      }
    }
    
    // Calculate average correlation
    let totalCorrelation = 0;
    let count = 0;
    
    for (const exchange1 of exchanges) {
      for (const exchange2 of exchanges) {
        if (exchange1 !== exchange2) {
          totalCorrelation += correlationMatrix[exchange1][exchange2].priceCorrelation;
          count++;
        }
      }
    }
    
    const avgCorrelation = count > 0 ? totalCorrelation / count : 0;
    const marketCohesion = avgCorrelation * 100;
    
    // Identify outliers
    const outlierExchanges: string[] = [];
    for (const exchange of exchanges) {
      let avgCorr = 0;
      let pairCount = 0;
      
      for (const other of exchanges) {
        if (exchange !== other) {
          avgCorr += correlationMatrix[exchange][other].priceCorrelation;
          pairCount++;
        }
      }
      
      if (pairCount > 0 && avgCorr / pairCount < 0.5) {
        outlierExchanges.push(exchange);
      }
    }
    
    return {
      symbol,
      timeframe,
      correlationMatrix,
      avgCorrelation,
      marketCohesion,
      outlierExchanges,
      timestamp: new Date().toISOString()
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCompleteness(klines: SynchronizedKlines): number {
    let totalQuality = 0;
    let totalWeight = 0;
    
    for (const [_, data] of Object.entries(klines.exchanges)) {
      totalQuality += data.dataQuality * data.weight;
      totalWeight += data.weight;
    }
    
    return totalWeight > 0 ? totalQuality / totalWeight : 0;
  }

  private calculateTimeliness(ticker: AggregatedTicker): number {
    const now = Date.now();
    let totalFreshness = 0;
    let count = 0;
    
    for (const [_, data] of Object.entries(ticker.exchanges)) {
      const age = now - parseInt(data.ticker.timestamp);
      const freshness = Math.max(0, 100 - age / 1000); // Penalty per second
      totalFreshness += freshness;
      count++;
    }
    
    return count > 0 ? totalFreshness / count : 0;
  }

  private calculateReliability(
    ticker: AggregatedTicker,
    klines: SynchronizedKlines
  ): number {
    // Combine multiple factors
    const priceReliability = ticker.confidence;
    const dataReliability = klines.confidence;
    const healthScore = this.calculateHealthScore();
    
    return (priceReliability * 0.4 + dataReliability * 0.4 + healthScore * 0.2);
  }

  private calculateHealthScore(): number {
    let totalScore = 0;
    let count = 0;
    
    for (const [_, health] of this.healthCache) {
      const score = health.isHealthy ? 100 : 
                    health.errorRate > 5 ? 50 : 0;
      totalScore += score;
      count++;
    }
    
    return count > 0 ? totalScore / count : 0;
  }
}
