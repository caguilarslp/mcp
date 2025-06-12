import { BollingerBandsService } from './build/services/bollingerBands.js';
import { BybitMarketDataService } from './build/services/marketData.js';

// Crear instancias de servicios
const marketDataService = new BybitMarketDataService();
const bollingerService = new BollingerBandsService(marketDataService);

// Test del caso HBARUSDT
async function testHBARUSDT() {
  try {
    console.log('🧪 Testing HBARUSDT Bollinger Bands fix...');
    
    const analysis = await bollingerService.analyzeBollingerBands('HBARUSDT', '60');
    
    console.log('📊 Analysis Results:');
    console.log('Current Price:', analysis.currentPrice);
    console.log('Current Bands:', {
      upper: analysis.currentBands.upper.toFixed(6),
      middle: analysis.currentBands.middle.toFixed(6),
      lower: analysis.currentBands.lower.toFixed(6)
    });
    
    console.log('Pattern:', analysis.pattern.type);
    console.log('Target Price:', analysis.pattern.targetPrice?.toFixed(6) || 'undefined');
    console.log('Signal:', analysis.signals.signal);
    console.log('Reasoning:', analysis.signals.reasoning);
    
    // Verificar consistencia
    if (analysis.pattern.targetPrice && analysis.signals.signal !== 'hold' && analysis.signals.signal !== 'wait') {
      const direction = analysis.pattern.targetPrice > analysis.currentPrice ? 'up' : 'down';
      const consistent = (analysis.signals.signal === 'buy' && direction === 'up') || 
                        (analysis.signals.signal === 'sell' && direction === 'down');
      
      console.log('🎯 Target Consistency:', consistent ? '✅ CORRECT' : '❌ INCORRECT');
      console.log('Signal Direction:', analysis.signals.signal === 'buy' ? 'UP' : 'DOWN');
      console.log('Target Direction:', direction.toUpperCase());
    }
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Ejecutar test
testHBARUSDT()
  .then(() => console.log('✅ Test completed'))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
