#!/usr/bin/env python3
"""
Script de verificación para los nuevos símbolos de utilidad
Verifica que se estén recolectando datos de todos los exchanges
"""

import pymongo
import os
from datetime import datetime, timedelta
from collections import defaultdict

# Configuración de MongoDB
MONGODB_URL = "mongodb://wadm:wadm_secure_pass_2025@localhost:27017/wadm"

# Símbolos esperados por categoría (según docker-compose.yml)
EXPECTED_SYMBOLS = {
    "reference": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "TRXUSDT"],
    "iso20022": ["XRPUSDT", "XLMUSDT", "HBARUSDT", "ADAUSDT", "QNTUSDT", "ALGOUSDT"],
    "rwa": ["ONDOUSDT", "LINKUSDT", "POLYXUSDT", "TRUUSDT", "RIOUSDT", "MANTRAUSDT"],
    "ai": ["RENDERUSDT", "ICPUSDT", "FETUSDT", "OCEANUSDT", "AGIXUSDT", "TAOUSDT", "VIRTUALUSDT", "ARKMUSDT"]
}

def verify_symbols():
    """Verifica que los nuevos símbolos se estén recolectando"""
    print("🔍 VERIFICACIÓN DE SÍMBOLOS DE UTILIDAD")
    print("="*50)
    
    try:
        # Conectar a MongoDB
        client = pymongo.MongoClient(MONGODB_URL)
        db = client.wadm
        
        # Obtener datos de los últimos 30 minutos
        since = datetime.utcnow() - timedelta(minutes=30)
        
        # Verificar por exchange
        exchanges = ["bybit", "binance", "coinbase", "kraken"]
        results = defaultdict(dict)
        
        for exchange in exchanges:
            print(f"\n📊 {exchange.upper()}:")
            
            # Obtener símbolos únicos con trades recientes
            pipeline = [
                {"$match": {
                    "exchange": exchange,
                    "timestamp": {"$gte": since}
                }},
                {"$group": {
                    "_id": "$symbol",
                    "trade_count": {"$sum": 1},
                    "last_trade": {"$max": "$timestamp"}
                }},
                {"$sort": {"trade_count": -1}}
            ]
            
            symbols_data = list(db.trades.aggregate(pipeline))
            
            if not symbols_data:
                print(f"  ❌ Sin datos recientes")
                continue
                
            # Organizar por categorías
            found_symbols = {symbol["_id"] for symbol in symbols_data}
            
            for category, expected in EXPECTED_SYMBOLS.items():
                category_found = []
                category_missing = []
                
                for symbol in expected:
                    # Para Coinbase y Kraken, convertir formato
                    if exchange == "coinbase":
                        check_symbol = symbol.replace("USDT", "").replace("USDT", "") + "-USD"
                        if symbol == "BTCUSDT":
                            check_symbol = "BTC-USD"
                    elif exchange == "kraken":
                        if symbol == "BTCUSDT":
                            check_symbol = "XBT/USD"
                        else:
                            check_symbol = symbol.replace("USDT", "") + "/USD"
                    else:
                        check_symbol = symbol
                    
                    if check_symbol in found_symbols:
                        trade_data = next(s for s in symbols_data if s["_id"] == check_symbol)
                        category_found.append(f"{check_symbol} ({trade_data['trade_count']} trades)")
                    else:
                        category_missing.append(check_symbol)
                
                if category_found:
                    print(f"  ✅ {category.upper()}: {', '.join(category_found)}")
                if category_missing:
                    print(f"  ❌ {category.upper()} FALTANTES: {', '.join(category_missing)}")
            
            results[exchange] = {
                "total_symbols": len(symbols_data),
                "total_trades": sum(s["trade_count"] for s in symbols_data),
                "symbols": found_symbols
            }
        
        # Resumen final
        print(f"\n📈 RESUMEN GENERAL:")
        print("="*30)
        
        total_trades = sum(r["total_trades"] for r in results.values())
        total_symbols = len(set().union(*[r["symbols"] for r in results.values()]))
        
        print(f"Total de trades (30 min): {total_trades:,}")
        print(f"Símbolos únicos activos: {total_symbols}")
        
        for exchange, data in results.items():
            if data["total_trades"] > 0:
                print(f"  • {exchange.capitalize()}: {data['total_trades']:,} trades, {data['total_symbols']} símbolos")
        
        # Verificar cobertura por categoría
        print(f"\n🎯 COBERTURA POR CATEGORÍA:")
        all_found = set().union(*[r["symbols"] for r in results.values()])
        
        for category, expected in EXPECTED_SYMBOLS.items():
            found_count = 0
            for symbol in expected:
                # Verificar en cualquier formato
                if (symbol in all_found or 
                    symbol.replace("USDT", "-USD") in all_found or
                    symbol.replace("USDT", "/USD") in all_found or
                    symbol.replace("BTCUSDT", "XBT/USD") in all_found):
                    found_count += 1
            
            coverage = (found_count / len(expected)) * 100
            status = "✅" if coverage >= 80 else "⚠️" if coverage >= 50 else "❌"
            print(f"  {status} {category.upper()}: {found_count}/{len(expected)} ({coverage:.0f}%)")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_symbols() 