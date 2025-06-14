# Diagnóstico Final del WebSocket Collector

## El Collector ESTÁ funcionando correctamente

Los logs muestran que:
- ✅ WebSocket conectado y activo
- ✅ 48 mensajes recibidos y procesados
- ✅ Estado "active" y healthy
- ❓ Pero no se ven trades en el storage

## Comandos para diagnosticar el storage

### 1. Reconstruir con los nuevos logs
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### 2. Ver logs en tiempo real
```bash
# Ver solo logs relacionados con trades y storage
docker-compose logs -f app | grep -E "Stored trade|Total trades|storage|Storage"
```

### 3. Verificar el debug del storage
```bash
# Nuevo endpoint de debug
curl http://localhost:8000/debug/storage | python -m json.tool
```

### 4. Monitorear en tiempo real
```bash
# Ver trades llegando en tiempo real
watch -n 1 'curl -s http://localhost:8000/debug/storage | python -m json.tool | grep -A 20 "sample_trades"'
```

### 5. Verificar si el storage handler está conectado
```bash
curl http://localhost:8000/debug/storage | python -m json.tool | grep "collector_.*_storage"
```

## Posibles causas del problema

1. **Storage handler no conectado**: El collector puede no tener referencia al storage
2. **Problema de threading**: El Lock podría estar bloqueando
3. **Trades procesados pero no visibles**: Problema en el endpoint de consulta

## Test manual del storage

```bash
# Crear script de test dentro del contenedor
docker exec -it cloud_marketdata-app-1 python -c "
import asyncio
from src.collectors.storage.memory import InMemoryStorage
from src.entities.trade import Trade, TradeSide
from decimal import Decimal
from datetime import datetime

async def test():
    storage = InMemoryStorage()
    
    # Crear trade de prueba
    trade = Trade(
        symbol='BTCUSDT',
        side=TradeSide.BUY,
        price=Decimal('104500.00'),
        quantity=Decimal('0.001'),
        timestamp=datetime.now(),
        exchange='test',
        trade_id='test-1'
    )
    
    # Almacenar
    await storage.store_trade(trade)
    
    # Recuperar
    trades = await storage.get_recent_trades()
    print(f'Trades almacenados: {len(trades)}')
    print(f'Stats: {await storage.get_stats()}')

asyncio.run(test())
"
```

## Logs esperados después de los cambios

Deberías ver:
1. "Stored trade #1: BTCUSDT Buy 104569.5@0.019691"
2. "Total trades for BTCUSDT: 1"
3. "Stored trade #2: ..."
4. etc.

Si NO ves estos logs, significa que el storage handler no está recibiendo los trades.

## Solución si el storage no está conectado

El problema puede ser que el storage handler no se está pasando correctamente al collector. Verificar en el CollectorManager que se esté pasando correctamente.
