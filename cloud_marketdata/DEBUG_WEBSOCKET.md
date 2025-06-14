# Diagnóstico y Solución del WebSocket Collector

## 1. Primero, reconstruye y verifica los logs

```bash
# Detener y reconstruir
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Ver logs con timestamps
docker-compose logs -f --timestamps app
```

## 2. Ejecuta el test de WebSocket directamente

```bash
# Copia el archivo de test al contenedor
docker cp test_websocket.py cloud_marketdata-app-1:/app/

# Ejecuta el test dentro del contenedor
docker exec -it cloud_marketdata-app-1 python test_websocket.py
```

Si el test funciona, significa que el problema está en la integración con FastAPI/AsyncIO.

## 3. Verifica el estado del collector via API

```bash
# Estado detallado del collector
curl http://localhost:8000/collectors/status/bybit_trades | python -m json.tool
```

## 4. Si el WebSocket no conecta desde Docker

Posibles causas:
1. **DNS Resolution**: Docker puede tener problemas resolviendo el DNS
2. **Proxy/Firewall**: Algún proxy corporativo bloqueando WebSockets
3. **Network Mode**: Cambiar a host network temporalmente

Para probar con host network:
```yaml
# En docker-compose.yml, agregar al servicio app:
network_mode: "host"
```

## 5. Si el problema es con AsyncIO

El problema podría ser que el task no se está ejecutando. Para verificar, agreguemos un endpoint de debug:

```python
# Agregar en main.py
@app.get("/debug/tasks")
async def debug_tasks():
    import asyncio
    tasks = asyncio.all_tasks()
    return {
        "total_tasks": len(tasks),
        "tasks": [str(task) for task in tasks]
    }
```

## 6. Solución Alternativa - Iniciar collector manualmente

Si el collector no inicia automáticamente, podemos forzar su inicio:

```python
# En el manager.py, cambiar el método start para ser más agresivo
async def start(self):
    # ... código existente ...
    
    # Después de await collector.start()
    # Verificar que realmente esté corriendo
    await asyncio.sleep(1)
    if collector.status != CollectorStatus.ACTIVE:
        self.logger.warning(f"Collector {name} not active, forcing reconnection")
        # Intentar nuevamente
        await collector.stop()
        await collector.start()
```

## 7. Verificar que el problema no sea el InMemoryStorage

El storage podría estar bloqueando si hay algún deadlock. Verificar agregando logs al storage:

```python
# En storage/memory.py
async def store_trade(self, trade: Trade) -> None:
    self.logger.debug(f"Storing trade: {trade.symbol} @ {trade.price}")
    # ... resto del código
```

## Diagnóstico Esperado

Después de estos cambios, deberías ver en los logs:
1. "Connecting to WebSocket: wss://stream.bybit.com/v5/public/spot"
2. "WebSocket connection established for bybit_trades"
3. "Connected to Bybit WebSocket API v5"
4. "Successfully subscribed to: publicTrade.BTCUSDT"
5. Mensajes de trades entrando

Si ves el paso 1 pero no el 2, el problema es de conexión.
Si ves hasta el 2 pero no el 3, el problema es en el callback.
Si ves hasta el 4 pero no trades, puede ser que Bybit no esté enviando datos.
