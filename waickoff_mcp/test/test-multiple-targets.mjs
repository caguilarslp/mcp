import { BollingerBandsService } from './build/services/bollingerBands.js';
import { BybitMarketDataService } from './build/services/marketData.js';

// Crear instancias de servicios
const marketDataService = new BybitMarketDataService();
const bollingerService = new BollingerBandsService(marketDataService);

// Test del nuevo sistema de múltiples targets
async function testMultipleTargets() {
  try {
    console.log('🧪 Testing HBARUSDT Bollinger Multiple Targets...');
    
    const analysis = await bollingerService.analyzeBollingerBands('HBARUSDT', '60');
    
    console.log('📊 Analysis Results:');
    console.log('Current Price:', analysis.currentPrice);
    console.log('Current Bands:', {
      upper: analysis.currentBands.upper.toFixed(6),
      middle: analysis.currentBands.middle.toFixed(6),
      lower: analysis.currentBands.lower.toFixed(6),
      position: analysis.currentBands.position.toFixed(1)
    });
    
    console.log('Pattern:', analysis.pattern.type);
    console.log('Pattern Actionable:', analysis.pattern.actionable);
    console.log('Pattern Confidence:', analysis.pattern.confidence);
    
    // Legacy single target
    if (analysis.pattern.targetPrice) {
      console.log('Legacy Target:', analysis.pattern.targetPrice.toFixed(6));
    }
    
    // New multiple targets
    if (analysis.pattern.targets) {
      console.log('🎯 Multiple Targets:');
      console.log('  Conservative:', analysis.pattern.targets.conservative.toFixed(6), 
                  `(${analysis.pattern.targets.probability.conservative}%)`);
      console.log('  Normal:', analysis.pattern.targets.normal.toFixed(6), 
                  `(${analysis.pattern.targets.probability.normal}%)`);
      console.log('  Aggressive:', analysis.pattern.targets.aggressive.toFixed(6), 
                  `(${analysis.pattern.targets.probability.aggressive}%)`);
    }
    
    console.log('Signal:', analysis.signals.signal);
    console.log('Signal Strength:', analysis.signals.strength);
    console.log('Reasoning:', analysis.signals.reasoning);
    
    // Verificar consistencia de múltiples targets
    if (analysis.pattern.targets && analysis.signals.signal !== 'hold' && analysis.signals.signal !== 'wait') {
      const targets = analysis.pattern.targets;
      const currentPrice = analysis.currentPrice;
      
      console.log('🔍 Target Validation:');
      
      const levels = ['conservative', 'normal', 'aggressive'] as const;
      for (const level of levels) {
        const target = targets[level];
        const probability = targets.probability[level];
        const direction = target > currentPrice ? 'UP' : 'DOWN';
        const movement = ((target - currentPrice) / currentPrice * 100).toFixed(2);
        const consistent = (analysis.signals.signal === 'buy' && direction === 'UP') || 
                          (analysis.signals.signal === 'sell' && direction === 'DOWN');
        
        console.log(`  ${level.toUpperCase()}: ${target.toFixed(6)} | ${direction} ${movement}% | ${probability}% | ${consistent ? '✅' : '❌'}`);
      }
    }
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Ejecutar test
testMultipleTargets()
  .then(() => console.log('✅ Multiple targets test completed'))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
