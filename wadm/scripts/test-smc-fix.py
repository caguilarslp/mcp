#!/usr/bin/env python3
"""
Script de prueba rápida para verificar que el error SMC se ha corregido
"""

import sys
import os
sys.path.append('/app/src')

import asyncio
from src.smc.smc_dashboard import SMCDashboard
from src.storage.mongo_manager import MongoStorageManager

async def test_smc_fix():
    """Prueba rápida del fix SMC"""
    print("🔧 PRUEBA DEL FIX SMC")
    print("="*40)
    
    try:
        # Inicializar storage y dashboard
        storage = MongoStorageManager()
        dashboard = SMCDashboard(storage)
        
        # Probar con XRPUSDT (el símbolo que causaba el error)
        print("📊 Probando análisis SMC para XRPUSDT...")
        
        analysis = await dashboard.get_comprehensive_analysis("XRPUSDT")
        
        print(f"✅ Análisis completado exitosamente!")
        print(f"   - Símbolo: {analysis.symbol}")
        print(f"   - Precio actual: ${analysis.current_price:.4f}")
        print(f"   - Bias SMC: {analysis.smc_bias.value}")
        print(f"   - Dirección de tendencia: {analysis.trend_direction}")
        print(f"   - Score de confluencia: {analysis.confluence_score:.1f}%")
        print(f"   - Order Blocks: {len(analysis.order_blocks)}")
        print(f"   - Fair Value Gaps: {len(analysis.fair_value_gaps)}")
        print(f"   - Structure Breaks: {len(analysis.structure_breaks)}")
        print(f"   - Liquidity Zones: {len(analysis.liquidity_zones)}")
        
        print(f"\n🎯 RESULTADO: ERROR CORREGIDO ✅")
        
    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
        print(f"   Tipo: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_smc_fix())
    exit(0 if success else 1) 