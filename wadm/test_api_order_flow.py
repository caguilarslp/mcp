#!/usr/bin/env python3
"""
Test de API REST para Order Flow endpoints.
Requiere tener el servidor FastAPI ejecutándose.
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

API_BASE = "http://localhost:8920/api/v1"

async def test_order_flow_api():
    """Test de todos los endpoints de Order Flow."""
    print("🌐 TESTING ORDER FLOW API ENDPOINTS")
    print("="*50)
    
    async with httpx.AsyncClient() as client:
        
        # Test 1: Current Order Flow
        print("\n📊 Test 1: Current Order Flow")
        try:
            response = await client.get(
                f"{API_BASE}/order-flow/current/BTCUSDT",
                params={
                    "exchange": "bybit",
                    "timeframe": "5m",
                    "use_orderbook": False
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Net Delta: {data['order_flow']['net_delta']}")
                print(f"✅ Buy %: {data['order_flow']['buy_percentage']:.1f}%")
                print(f"✅ Market Condition: {data['market_condition']}")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Test 2: Historical Series
        print("\n📈 Test 2: Historical Order Flow Series")
        try:
            response = await client.get(
                f"{API_BASE}/order-flow/historical/BTCUSDT",
                params={
                    "exchange": "bybit",
                    "timeframe": "5m",
                    "periods": 12
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Períodos obtenidos: {len(data)}")
                if data:
                    print(f"✅ Primer período - Delta: {data[0]['net_delta']}")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Test 3: Absorption Events
        print("\n🎯 Test 3: Absorption Events")
        try:
            response = await client.get(
                f"{API_BASE}/order-flow/absorption-events/BTCUSDT",
                params={
                    "exchange": "bybit",
                    "timeframe": "5m",
                    "lookback_periods": 12
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Eventos de absorción detectados: {len(data)}")
                for event in data[:3]:  # Mostrar primeros 3
                    print(f"   - ${event['price']:.2f}: {event['absorption_type']} "
                          f"(Strength: {event['strength']:.1f}%)")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Test 4: Delta Analysis
        print("\n📊 Test 4: Delta Analysis")
        try:
            response = await client.get(
                f"{API_BASE}/order-flow/delta-analysis/BTCUSDT",
                params={
                    "exchange": "bybit",
                    "timeframe": "5m",
                    "periods": 24
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Trend: {data['trend']}")
                print(f"✅ Strength: {data['strength']:.1f}%")
                print(f"✅ Cumulative Delta: {data['cumulative_delta']:.2f}")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Test 5: Market Efficiency
        print("\n⚖️ Test 5: Market Efficiency")
        try:
            response = await client.get(
                f"{API_BASE}/order-flow/market-efficiency/BTCUSDT",
                params={
                    "exchange": "bybit",
                    "timeframe": "5m",
                    "periods": 12
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Efficiency Score: {data['efficiency_score']:.1f}%")
                print(f"✅ Market Condition: {data['market_condition']}")
                print(f"✅ Buy Dominance: {data['buy_dominance']:.1f}%")
            else:
                print(f"❌ Error: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")

async def main():
    """Función principal de testing."""
    print("🔧 Iniciando tests de API...")
    print("💡 Asegúrate de que el servidor esté ejecutándose en localhost:8920")
    print("   Comando: python src/presentation/api/main.py")
    
    await test_order_flow_api()
    
    print("\n🎉 Tests de API completados!")

if __name__ == "__main__":
    asyncio.run(main())
