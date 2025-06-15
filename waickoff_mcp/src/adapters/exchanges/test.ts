/**
 * @fileoverview Exchange Adapters Test - TASK-026 FASE 1
 * @description Basic tests to verify exchange adapters are working
 * @version 1.0.0
 */

import { createBinanceAdapter, createBybitAdapter, testAllExchanges } from './index.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ExchangeAdaptersTest');

/**
 * Test individual exchange adapter
 */
async function testExchangeAdapter(exchangeName: string, adapter: any) {
  logger.info(`\n🧪 Testing ${exchangeName} adapter...`);
  
  try {
    // Test health check
    logger.info('📊 Testing health check...');
    const health = await adapter.healthCheck();
    logger.info(`✅ Health check passed - Latency: ${health.latency}ms`);
    
    // Test ticker
    logger.info('💰 Testing ticker (BTCUSDT)...');
    const ticker = await adapter.getTicker('BTCUSDT');
    logger.info(`✅ Ticker received - Price: $${ticker.lastPrice}, 24h: ${ticker.price24hPcnt}%`);
    
    // Test orderbook
    logger.info('📖 Testing orderbook (BTCUSDT)...');
    const orderbook = await adapter.getOrderbook('BTCUSDT', 'spot', 5);
    logger.info(`✅ Orderbook received - Bids: ${orderbook.bids.length}, Asks: ${orderbook.asks.length}, Spread: $${orderbook.spread.toFixed(2)}`);
    
    // Test klines
    logger.info('📈 Testing klines (BTCUSDT)...');
    const klines = await adapter.getKlines('BTCUSDT', '60', 5);
    logger.info(`✅ Klines received - ${klines.length} candles, Latest close: $${klines[klines.length - 1]?.close}`);
    
    // Test performance metrics
    const metrics = adapter.getPerformanceMetrics();
    logger.info(`📊 Performance metrics: ${metrics.length} recorded operations`);
    
    logger.info(`✅ ${exchangeName} adapter tests completed successfully!`);
    
    return {
      success: true,
      ticker: ticker.lastPrice,
      latency: health.latency,
      operations: metrics.length
    };
    
  } catch (error) {
    logger.error(`❌ ${exchangeName} adapter test failed:`, error);
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    await adapter.shutdown();
  }
}

/**
 * Test all adapters
 */
async function testAllAdapters() {
  logger.info('🚀 Starting Exchange Adapters Test Suite - TASK-026 FASE 1');
  logger.info('='.repeat(60));
  
  const results: { [key: string]: any } = {};
  
  // Test Binance
  logger.info('\n📊 Testing Binance Adapter');
  logger.info('-'.repeat(30));
  const binanceAdapter = createBinanceAdapter();
  results.binance = await testExchangeAdapter('Binance', binanceAdapter);
  
  // Test Bybit  
  logger.info('\n📊 Testing Bybit Adapter');
  logger.info('-'.repeat(30));
  const bybitAdapter = createBybitAdapter();
  results.bybit = await testExchangeAdapter('Bybit', bybitAdapter);
  
  // Test connection to all exchanges
  logger.info('\n🌐 Testing All Exchanges Connection');
  logger.info('-'.repeat(40));
  const connectionResults = await testAllExchanges();
  
  // Summary
  logger.info('\n📋 TEST SUMMARY');
  logger.info('='.repeat(40));
  
  for (const [exchange, result] of Object.entries(results)) {
    if (result.success) {
      logger.info(`✅ ${exchange.toUpperCase()}: SUCCESS`);
      logger.info(`   💰 BTC Price: $${result.ticker}`);
      logger.info(`   ⚡ Latency: ${result.latency}ms`);
      logger.info(`   📊 Operations: ${result.operations}`);
    } else {
      logger.error(`❌ ${exchange.toUpperCase()}: FAILED`);
      logger.error(`   Error: ${result.error}`);
    }
  }
  
  logger.info('\n🌐 Connection Test Results:');
  for (const [exchange, result] of Object.entries(connectionResults)) {
    const status = result.connected ? '✅ CONNECTED' : '❌ FAILED';
    const latencyInfo = result.latency ? ` (${result.latency}ms)` : '';
    const errorInfo = result.error ? ` - ${result.error}` : '';
    logger.info(`   ${exchange.toUpperCase()}: ${status}${latencyInfo}${errorInfo}`);
  }
  
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;
  
  if (successCount === totalCount) {
    logger.info('\n🎉 ALL TESTS PASSED! Exchange adapters are working correctly.');
    logger.info('✅ TASK-026 FASE 1 implementation is ready for integration.');
  } else {
    logger.error(`\n⚠️  ${successCount}/${totalCount} tests passed. Some exchanges may need attention.`);
  }
  
  return {
    success: successCount === totalCount,
    results,
    connectionResults
  };
}

/**
 * Run tests if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllAdapters()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { testAllAdapters, testExchangeAdapter };
