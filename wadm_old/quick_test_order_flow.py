#!/usr/bin/env python3
"""
Prueba rápida del Order Flow Analyzer con datos sintéticos.
Ejecuta una demostración completa sin necesidad de base de datos.
"""

import sys
import asyncio
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

async def quick_test():
    """Prueba rápida del sistema Order Flow."""
    print("🚀 PRUEBA RÁPIDA - ORDER FLOW ANALYZER")
    print("="*50)
    
    try:
        # Import Order Flow components
        from examples.order_flow.order_flow_example import main
        
        print("📊 Ejecutando ejemplo completo...")
        await main()
        
        print("\n✅ ¡Prueba exitosa! El Order Flow Analyzer funciona correctamente.")
        
    except ImportError as e:
        print(f"❌ Error de importación: {e}")
        print("💡 Asegúrate de que el proyecto esté correctamente configurado")
    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(quick_test())
