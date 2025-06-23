/**
 * @fileoverview Multi-Exchange Aggregator Handlers - TASK-026 FASE 2
 * @description MCP handlers for exchange aggregation functionality
 * @version 1.0.0
 */

import { ToolHandler } from '../types/mcp.types.js';
import { IEngine, EngineError } from '../../core/index.js';
import { 
  ExchangeAggregator,
  SupportedExchange,
  ExchangeDivergence,
  ArbitrageOpportunity,
  ExchangeDominance,
  MultiExchangeAnalytics,
  AggregatedTicker,
  CompositeOrderbook
} from '../exchanges/index.js';
import { createExchangeAdapterFactory } from '../exchanges/index.js';
import { MarketCategoryType } from '../../types/index.js';

// Helper function to format ticker
function formatTicker(ticker: AggregatedTicker): any {
  return {
    symbol: ticker.symbol,
    lastPrice: ticker.lastPrice,
    price24hPcnt: ticker.price24hPcnt,
    highPrice24h: ticker.highPrice24h,
    lowPrice24h: ticker.lowPrice24h,
    volume24h: ticker.volume24h,
    bid1Price: ticker.bid1Price,
    ask1Price: ticker.ask1Price,
    timestamp: ticker.timestamp
  };
}

// Helper function to format orderbook
function formatOrderbook(orderbook: CompositeOrderbook): any {
  return {
    symbol: orderbook.symbol,
    bids: orderbook.bids.slice(0, 10).map(bid => ({
      price: bid.price,
      size: bid.size
    })),
    asks: orderbook.asks.slice(0, 10).map(ask => ({
      price: ask.price,
      size: ask.size
    })),
    timestamp: orderbook.timestamp,
    spread: orderbook.spread
  };
}

/**
 * Create multi-exchange handlers
 */
export function createMultiExchangeHandlers(engine: IEngine): ToolHandler[] {
  // Initialize aggregator with configured exchanges
  let aggregator: ExchangeAggregator | null = null;

  const getAggregator = async (exchanges?: string[]): Promise<ExchangeAggregator> => {
    if (!aggregator || exchanges) {
      const factory = createExchangeAdapterFactory();
      const adapters = new Map();
      
      const exchangesToUse = exchanges || Object.values(SupportedExchange);
      
      for (const exchange of exchangesToUse) {
        try {
          const adapter = factory.createAdapter(exchange);
          adapters.set(exchange, adapter);
        } catch (error) {
          console.warn(`Failed to create adapter for ${exchange}`, error);
        }
      }
      
      if (adapters.size === 0) {
        throw new EngineError('AGGREGATOR_ERROR', 'No exchange adapters available');
      }
      
      aggregator = new ExchangeAggregator(adapters);
    }
    
    return aggregator;
  };

  const getAggregatedTickerHandler: ToolHandler = async (args: {
    symbol: string;
    category?: MarketCategoryType;
    exchanges?: string[];
  }) => {
    try {
      const agg = await getAggregator(args.exchanges);
      const ticker = await agg.getAggregatedTicker(args.symbol, args.category);
      
      // Format response
      const formattedTicker = formatTicker(ticker);
      
      // Add multi-exchange specific info
      const exchangeInfo = Object.entries(ticker.exchanges).map(([name, data]) => ({
        exchange: name,
        price: data.ticker.lastPrice,
        volume: data.ticker.volume24h,
        weight: data.weight,
        responseTime: data.responseTime
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...formattedTicker,
              weightedPrice: ticker.weightedPrice,
              priceDeviation: ticker.priceDeviation,
              volumeTotal: ticker.volumeTotal,
              priceRange: ticker.priceRange,
              confidence: ticker.confidence,
              exchanges: exchangeInfo
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to get aggregated ticker: ${error}`
      );
    }
  };

  const getCompositeOrderbookHandler: ToolHandler = async (args: {
    symbol: string;
    category?: MarketCategoryType;
    limit?: number;
    exchanges?: string[];
  }) => {
    try {
      const agg = await getAggregator(args.exchanges);
      const orderbook = await agg.getCompositeOrderbook(
        args.symbol,
        args.category,
        args.limit
      );
      
      // Format response
      const formattedOrderbook = formatOrderbook(orderbook);
      
      // Add multi-exchange specific info
      const exchangeContributions = Object.entries(orderbook.exchanges).map(([name, data]) => ({
        exchange: name,
        contribution: `${data.contribution.toFixed(1)}%`,
        weight: data.weight,
        bidLevels: data.orderbook.bids.length,
        askLevels: data.orderbook.asks.length
      }));
      
      const arbitrageOpps = orderbook.arbitrageOpportunities.map(opp => ({
        buyFrom: opp.buyExchange,
        sellTo: opp.sellExchange,
        spread: `${opp.spread.toFixed(3)}%`,
        profit: `${opp.potentialProfit.toFixed(3)}%`,
        confidence: opp.confidence,
        risk: opp.riskLevel
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...formattedOrderbook,
              aggregatedDepth: {
                totalBidVolume: orderbook.aggregatedDepth.totalBidVolume,
                totalAskVolume: orderbook.aggregatedDepth.totalAskVolume,
                weightedSpread: `${orderbook.aggregatedDepth.weightedSpread.toFixed(3)}%`,
                liquidityScore: orderbook.aggregatedDepth.liquidityScore.toFixed(1)
              },
              exchanges: exchangeContributions,
              arbitrageOpportunities: arbitrageOpps
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to get composite orderbook: ${error}`
      );
    }
  };

  const detectExchangeDivergencesHandler: ToolHandler = async (args: {
    symbol: string;
    category?: MarketCategoryType;
    minDivergence?: number;
  }) => {
    try {
      const agg = await getAggregator();
      const divergences = await agg.detectDivergences(args.symbol, args.category);
      
      // Filter by minimum divergence if specified
      const minDivergence = args.minDivergence;
      const filtered = minDivergence !== undefined
        ? divergences.filter(d => d.magnitude >= minDivergence)
        : divergences;
      
      // Format divergences
      const formatted = filtered.map(div => ({
        type: div.type,
        leadExchange: div.leadExchange,
        lagExchange: div.lagExchange,
        magnitude: `${div.magnitude.toFixed(2)}%`,
        opportunity: div.opportunity,
        confidence: div.confidence,
        risk: div.riskLevel,
        priceTarget: div.priceTarget,
        details: formatDivergenceDetails(div)
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              symbol: args.symbol,
              divergenceCount: formatted.length,
              divergences: formatted,
              summary: generateDivergenceSummary(filtered)
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to detect divergences: ${error}`
      );
    }
  };

  const identifyArbitrageOpportunitiesHandler: ToolHandler = async (args: {
    symbol: string;
    category?: MarketCategoryType;
    minSpread?: number;
  }) => {
    try {
      const agg = await getAggregator();
      const opportunities = await agg.identifyArbitrage(args.symbol, args.category);
      
      // Filter by minimum spread if specified
      const minSpread = args.minSpread;
      const filtered = minSpread !== undefined
        ? opportunities.filter(opp => opp.spread >= minSpread)
        : opportunities;
      
      // Sort by profit potential
      filtered.sort((a, b) => b.potentialProfit - a.potentialProfit);
      
      // Format opportunities
      const formatted = filtered.map(opp => ({
        type: opp.type,
        buyFrom: opp.buyExchange,
        sellTo: opp.sellExchange,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        spread: `${opp.spread.toFixed(3)}%`,
        profit: `${opp.potentialProfit.toFixed(3)}%`,
        volume: opp.volume,
        timeWindow: `${opp.timeWindow}s`,
        confidence: opp.confidence,
        risk: opp.riskLevel,
        fees: {
          buy: `${opp.fees.buyFee}%`,
          sell: `${opp.fees.sellFee}%`,
          total: `${opp.fees.totalFees}%`
        }
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              symbol: args.symbol,
              opportunityCount: formatted.length,
              opportunities: formatted,
              summary: generateArbitrageSummary(filtered)
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to identify arbitrage: ${error}`
      );
    }
  };

  const getExchangeDominanceHandler: ToolHandler = async (args: {
    symbol: string;
    timeframe?: string;
  }) => {
    try {
      const agg = await getAggregator();
      const dominance = await agg.getExchangeDominance(args.symbol, args.timeframe);
      
      // Format dominance data
      const formattedDominance = Object.entries(dominance.dominanceByExchange).map(([exchange, metrics]) => ({
        exchange,
        volumeShare: `${metrics.volumeShare.toFixed(1)}%`,
        priceInfluence: `${metrics.priceInfluence.toFixed(1)}%`,
        liquidityShare: `${metrics.liquidityShare.toFixed(1)}%`,
        momentumLeadership: `${metrics.momentumLeadership.toFixed(1)}%`,
        overallScore: ((metrics.volumeShare + metrics.priceInfluence + metrics.liquidityShare + metrics.momentumLeadership) / 4).toFixed(1)
      }));
      
      // Sort by overall score
      formattedDominance.sort((a, b) => parseFloat(b.overallScore) - parseFloat(a.overallScore));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              symbol: args.symbol,
              timeframe: args.timeframe || '1h',
              marketLeader: dominance.marketLeader,
              dominance: formattedDominance,
              volumeMigration: {
                trend: dominance.volumeMigration.trend,
                rate: `${dominance.volumeMigration.rate.toFixed(2)}%`,
                direction: dominance.volumeMigration.direction
              },
              institutionalPreference: Object.entries(dominance.institutionalPreference).map(([exchange, score]) => ({
                exchange,
                score: score.toFixed(1)
              })),
              analysis: generateDominanceAnalysis(dominance)
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to get exchange dominance: ${error}`
      );
    }
  };

  const getMultiExchangeAnalyticsHandler: ToolHandler = async (args: {
    symbol: string;
    timeframe?: string;
    includeKlines?: boolean;
  }) => {
    try {
      const agg = await getAggregator();
      const analytics = await agg.getMultiExchangeAnalytics(args.symbol, args.timeframe);
      
      // Format comprehensive analytics
      const response: any = {
        symbol: args.symbol,
        timeframe: args.timeframe || '1h',
        timestamp: analytics.timestamp,
        
        // Price and volume summary
        priceAnalysis: {
          weightedPrice: analytics.aggregatedTicker?.weightedPrice,
          priceDeviation: analytics.aggregatedTicker?.priceDeviation,
          priceRange: analytics.aggregatedTicker?.priceRange,
          confidence: analytics.aggregatedTicker?.confidence
        },
        
        // Market dominance
        dominance: {
          leader: analytics.dominance.marketLeader,
          shares: Object.entries(analytics.dominance.dominanceByExchange).map(([ex, data]) => ({
            exchange: ex,
            volume: `${data.volumeShare.toFixed(1)}%`
          }))
        },
        
        // Correlations
        correlations: formatCorrelations(analytics.correlation),
        
        // Opportunities
        opportunities: {
          arbitrage: analytics.arbitrageOpportunities.length,
          divergences: analytics.divergences.length,
          topArbitrage: analytics.arbitrageOpportunities[0] ? {
            spread: `${analytics.arbitrageOpportunities[0].spread.toFixed(3)}%`,
            profit: `${analytics.arbitrageOpportunities[0].potentialProfit.toFixed(3)}%`
          } : null
        },
        
        // Data quality
        dataQuality: {
          completeness: `${analytics.dataQuality.completeness.toFixed(1)}%`,
          consistency: `${analytics.dataQuality.consistency.toFixed(1)}%`,
          timeliness: `${analytics.dataQuality.timeliness.toFixed(1)}%`,
          reliability: `${analytics.dataQuality.reliability.toFixed(1)}%`
        }
      };
      
      // Add klines summary if requested
      if (args.includeKlines !== false && analytics.synchronizedKlines) {
        response.klinesSummary = {
          dataPoints: analytics.synchronizedKlines.aggregatedKlines.length,
          confidence: analytics.synchronizedKlines.confidence,
          gaps: Object.entries(analytics.synchronizedKlines.synchronizationGaps).map(([ex, gaps]) => ({
            exchange: ex,
            missingPeriods: gaps.missingPeriods.length,
            lag: `${(gaps.dataLag / 1000).toFixed(1)}s`
          }))
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new EngineError(
        'AGGREGATOR_ERROR',
        `Failed to get multi-exchange analytics: ${error}`
      );
    }
  };

  return [
    getAggregatedTickerHandler,
    getCompositeOrderbookHandler,
    detectExchangeDivergencesHandler,
    identifyArbitrageOpportunitiesHandler,
    getExchangeDominanceHandler,
    getMultiExchangeAnalyticsHandler
  ];
}

// Helper functions
function formatDivergenceDetails(div: ExchangeDivergence): string {
  switch (div.type) {
    case 'price':
      return `Price difference of ${div.magnitude.toFixed(2)}% detected`;
    case 'volume':
      return `Volume imbalance of ${div.magnitude.toFixed(2)}% detected`;
    case 'structure':
      return `Orderbook structure divergence of ${div.magnitude.toFixed(2)}% detected`;
    case 'momentum':
      return `Momentum divergence of ${div.magnitude.toFixed(2)}% detected`;
    default:
      return `${div.type} divergence detected`;
  }
}

function generateDivergenceSummary(divergences: ExchangeDivergence[]): any {
  const byType = divergences.reduce((acc, div) => {
    acc[div.type] = (acc[div.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byOpportunity = divergences.reduce((acc, div) => {
    acc[div.opportunity] = (acc[div.opportunity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: divergences.length,
    byType,
    byOpportunity,
    averageMagnitude: divergences.length > 0
      ? (divergences.reduce((sum, d) => sum + d.magnitude, 0) / divergences.length).toFixed(2)
      : 0,
    highRisk: divergences.filter(d => d.riskLevel === 'high').length
  };
}

function generateArbitrageSummary(opportunities: ArbitrageOpportunity[]): any {
  const byType = opportunities.reduce((acc, opp) => {
    acc[opp.type] = (acc[opp.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalPotentialProfit = opportunities.reduce((sum, opp) => sum + opp.potentialProfit, 0);
  const avgProfit = opportunities.length > 0 ? totalPotentialProfit / opportunities.length : 0;
  
  return {
    total: opportunities.length,
    byType,
    averageProfit: `${avgProfit.toFixed(3)}%`,
    totalPotentialProfit: `${totalPotentialProfit.toFixed(3)}%`,
    lowRisk: opportunities.filter(o => o.riskLevel === 'low').length,
    mediumRisk: opportunities.filter(o => o.riskLevel === 'medium').length,
    highRisk: opportunities.filter(o => o.riskLevel === 'high').length
  };
}

function generateDominanceAnalysis(dominance: ExchangeDominance): string {
  const leader = dominance.marketLeader;
  const leaderData = dominance.dominanceByExchange[leader];
  
  let analysis = `${leader.toUpperCase()} is currently dominating with ${leaderData.volumeShare.toFixed(1)}% volume share. `;
  
  if (dominance.volumeMigration.trend === 'centralizing') {
    analysis += `Volume is centralizing towards ${dominance.volumeMigration.direction} at ${Math.abs(dominance.volumeMigration.rate).toFixed(2)}% rate. `;
  } else if (dominance.volumeMigration.trend === 'decentralizing') {
    analysis += `Volume is decentralizing from ${dominance.volumeMigration.direction} at ${Math.abs(dominance.volumeMigration.rate).toFixed(2)}% rate. `;
  }
  
  const instPref = Object.entries(dominance.institutionalPreference)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (instPref) {
    analysis += `Institutional traders show preference for ${instPref[0].toUpperCase()} (${instPref[1].toFixed(1)} score).`;
  }
  
  return analysis;
}

function formatCorrelations(correlation: any): any {
  if (!correlation || !correlation.correlationMatrix) return null;
  
  const summary = {
    avgCorrelation: correlation.avgCorrelation.toFixed(3),
    marketCohesion: `${correlation.marketCohesion.toFixed(1)}%`,
    outliers: correlation.outlierExchanges,
    strongPairs: [] as string[],
    weakPairs: [] as string[]
  };
  
  // Find strong and weak correlations
  for (const [ex1, data] of Object.entries(correlation.correlationMatrix)) {
    for (const [ex2, corr] of Object.entries(data as any)) {
      if (ex1 !== ex2) {
        const pairName = `${ex1}-${ex2}`;
        if ((corr as any).strength === 'strong') {
          summary.strongPairs.push(pairName);
        } else if ((corr as any).strength === 'weak') {
          summary.weakPairs.push(pairName);
        }
      }
    }
  }
  
  return summary;
}
