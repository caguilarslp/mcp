/**
 * @fileoverview Test Exchange Aggregator - TASK-026 FASE 2
 * @description Simple test for Exchange Aggregator functionality
 * @version 1.0.0
 */

import { ExchangeAggregator } from './common/ExchangeAggregator.js';
import { createExchangeAdapterFactory } from './index.js';
import { SupportedExchange } from './common/types.js';
import { createLogger } from '../../utils/logger.js';

async function testAggregator() {
  const logger = createLogger('TestAggregator');
  
  try {
    logger.info('Creating exchange adapters...');
    
    // Create factory
    const factory = createExchangeAdapterFactory();
    
    // Create adapters
    const adapters = new Map();
    
    // Only create Bybit adapter for now (Binance would need API key)
    try {
      const bybitAdapter = factory.createAdapter(SupportedExchange.BYBIT);
      adapters.set(SupportedExchange.BYBIT, bybitAdapter);
      logger.info('Bybit adapter created successfully');
    } catch (error) {
      logger.error('Failed to create Bybit adapter', { error });
    }
    
    if (adapters.size === 0) {
      logger.error('No adapters available for testing');
      return;
    }
    
    // Create aggregator
    const aggregator = new ExchangeAggregator(adapters);
    logger.info('ExchangeAggregator created successfully');
    
    // Test aggregated ticker
    logger.info('Testing aggregated ticker...');
    try {
      const ticker = await aggregator.getAggregatedTicker('BTCUSDT');
      logger.info('Aggregated ticker retrieved', {
        symbol: ticker.symbol,
        weightedPrice: ticker.weightedPrice,
        confidence: ticker.confidence,
        exchanges: Object.keys(ticker.exchanges).length
      });
    } catch (error) {
      logger.error('Failed to get aggregated ticker', { error });
    }
    
    // Test exchange dominance
    logger.info('Testing exchange dominance...');
    try {
      const dominance = await aggregator.getExchangeDominance('BTCUSDT');
      logger.info('Exchange dominance retrieved', {
        marketLeader: dominance.marketLeader,
        exchanges: Object.keys(dominance.dominanceByExchange).length
      });
    } catch (error) {
      logger.error('Failed to get exchange dominance', { error });
    }
    
    logger.info('Aggregator test completed');
    
  } catch (error) {
    logger.error('Aggregator test failed', { error });
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAggregator().catch(console.error);
}

export { testAggregator };
