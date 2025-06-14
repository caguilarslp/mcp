# Solución WebSocket Collector - Paso a Paso

## 1. Reconstruir con los cambios

```bash
# Detener todo
docker-compose down

# Reconstruir sin cache
docker-compose build --no-cache

# Iniciar y ver logs en tiempo real
docker-compose up
```

## 2. En otra terminal, verificar el estado

```bash
# Verificar que el servicio esté corriendo
docker-compose ps

# Health check
curl http://localhost:8000/health | python -m json.tool

# Debug de tareas asyncio
curl http://localhost:8000/debug/tasks | python -m json.tool

# Estado específico del collector
curl http://localhost:8000/collectors/status/bybit_trades | python -m json.tool
```

## 3. Test directo de WebSocket

```bash
# Copiar el script de test
docker cp test_websocket.py cloud_marketdata-app-1:/app/

# Ejecutar test dentro del contenedor
docker exec -it cloud_marketdata-app-1 python test_websocket.py
```

## 4. Si el WebSocket no conecta

### Opción A: Verificar conectividad desde el contenedor
```bash
# Entrar al contenedor
docker exec -it cloud_marketdata-app-1 /bin/bash

# Instalar herramientas de red
apt-get update && apt-get install -y curl netcat-openbsd

# Probar conectividad
nc -zv stream.bybit.com 443
```

### Opción B: Cambiar a host network (temporal)
En `docker-compose.yml`:
```yaml
services:
  app:
    network_mode: "host"
    # Comentar los ports ya que no son necesarios con host network
```

## 5. Verificar logs específicos

```bash
# Ver solo logs del collector
docker-compose logs app | grep -E "collector|WebSocket|bybit"

# Ver logs con timestamps
docker-compose logs -f --timestamps app
```

## 6. Endpoints de prueba

```bash
# Ver trades recientes (debería empezar a llenarse)
watch -n 2 'curl -s http://localhost:8000/collectors/trades?limit=5 | python -m json.tool'

# Ver estadísticas del storage
watch -n 2 'curl -s http://localhost:8000/collectors/storage/stats | python -m json.tool'
```

## 7. Si sigue sin funcionar - Debugging avanzado

### Verificar que el problema no sea el asyncio Task
El endpoint `/debug/tasks` debería mostrar:
- El task del collector como `<Task pending ...>`
- Si muestra `<Task finished ...>` hay un error

### Logs esperados en orden:
1. "Initialized Bybit trades collector for symbols: ['BTCUSDT']"
2. "WebSocket URL: wss://stream.bybit.com/v5/public/spot"
3. "Starting collector: bybit_trades..."
4. "Starting collector bybit_trades"
5. "Creating task in event loop: <...>"
6. "Collector bybit_trades task created, task: <Task pending...>"
7. "Started collector: bybit_trades"
8. "Starting main loop for bybit_trades"
9. "Attempting to connect bybit_trades to wss://..."
10. "Connecting to WebSocket: wss://..."
11. "WebSocket connection established for bybit_trades"
12. "Connected to Bybit WebSocket API v5"
13. "Successfully subscribed to: publicTrade.BTCUSDT"
14. Mensajes de trades...

## 8. Solución final si nada funciona

Crear un collector simplificado sin el patrón Template:

```python
# test_simple_collector.py
import asyncio
import json
import websockets
from datetime import datetime

async def simple_bybit_collector():
    url = "wss://stream.bybit.com/v5/public/spot"
    
    while True:
        try:
            async with websockets.connect(url) as ws:
                print(f"[{datetime.now()}] Connected to Bybit")
                
                # Subscribe
                await ws.send(json.dumps({
                    "op": "subscribe",
                    "args": ["publicTrade.BTCUSDT"]
                }))
                
                # Receive messages
                async for message in ws:
                    data = json.loads(message)
                    if "topic" in data and data["topic"] == "publicTrade.BTCUSDT":
                        print(f"[{datetime.now()}] Trade: {data}")
                        
        except Exception as e:
            print(f"[{datetime.now()}] Error: {e}")
            await asyncio.sleep(5)

# Ejecutar
asyncio.run(simple_bybit_collector())
```

Ejecutar con:
```bash
docker exec -it cloud_marketdata-app-1 python test_simple_collector.py
```

## Resumen

El problema más común es que el asyncio Task no se está ejecutando correctamente en el contexto de FastAPI. Los cambios realizados deberían solucionar esto:

1. Uso explícito de `loop.create_task()` en lugar de `asyncio.create_task()`
2. `await asyncio.sleep(0)` para forzar el yield del control
3. Mejor logging para diagnosticar dónde se detiene
4. Endpoint de debug para ver el estado de los tasks

Si el test directo funciona pero el collector no, el problema está en la integración con FastAPI/asyncio.
