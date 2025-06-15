# 🧭 WADM - Decisiones de Arquitectura

## 📋 Registro de Decisiones

### DEC-001: Uso de MongoDB sobre PostgreSQL
**Fecha**: 15/06/2025  
**Estado**: Aprobada  
**Contexto**: Necesitamos almacenar datos de series temporales con esquemas flexibles.  
**Decisión**: Usar MongoDB por su flexibilidad de esquema y performance en time-series.  
**Consecuencias**: 
- ✅ Mejor performance para time-series data
- ✅ TTL indexes nativos para limpieza automática
- ❌ Menos consistencia ACID
- ❌ Requiere más RAM

---

### DEC-002: WebSocket sobre REST para recolección
**Fecha**: 15/06/2025  
**Estado**: Aprobada  
**Contexto**: Necesitamos datos en tiempo real de trades.  
**Decisión**: WebSocket para minimizar latencia y overhead.  
**Consecuencias**:
- ✅ Latencia mínima (<10ms)
- ✅ Menos overhead de red
- ❌ Más complejo manejo de reconexiones
- ❌ Requiere manejo de buffers

---

### DEC-003: MCP Protocol para distribución
**Fecha**: 15/06/2025  
**Estado**: Aprobada  
**Contexto**: Ya tenemos ecosistema MCP en wAIckoff.  
**Decisión**: Crear MCP Server/Client para consistencia.  
**Consecuencias**:
- ✅ Integración nativa con wAIckoff
- ✅ Protocolo ya conocido
- ❌ Overhead vs REST simple
- ❌ Requiere más desarrollo

---

### DEC-004: Docker Compose sobre Kubernetes
**Fecha**: 15/06/2025  
**Estado**: Aprobada  
**Contexto**: Deployment en VPS único, no necesitamos orquestación compleja.  
**Decisión**: Docker Compose por simplicidad.  
**Consecuencias**:
- ✅ Simplicidad de deployment
- ✅ Menos recursos requeridos
- ❌ No auto-scaling
- ❌ No alta disponibilidad nativa

---

### DEC-005: Procesamiento en Memoria vs Stream Processing
**Fecha**: 15/06/2025  
**Estado**: Pendiente  
**Contexto**: Necesitamos procesar ~1000 trades/segundo por símbolo.  
**Opciones**:
1. Buffer en memoria + batch processing
2. Apache Kafka + Flink
3. Redis Streams

**Consideraciones**:
- Volumen actual no justifica complejidad de Kafka
- Redis Streams podría ser middle ground
- Buffer en memoria es más simple

---

### DEC-006: Autenticación API Key vs OAuth2
**Fecha**: 15/06/2025  
**Estado**: Aprobada  
**Contexto**: Acceso desde IPs dinámicas, pocos usuarios.  
**Decisión**: API Keys simples con rate limiting.  
**Consecuencias**:
- ✅ Implementación simple
- ✅ Fácil rotación de keys
- ❌ No hay refresh tokens
- ❌ Menos granularidad de permisos

---

### DEC-007: Timeframes a Soportar
**Fecha**: 15/06/2025  
**Estado**: Pendiente  
**Opciones**:
1. Solo 1h (más simple)
2. Multi-timeframe: 5m, 15m, 1h, 4h, 1D
3. Configurable por usuario

**Consideraciones**:
- Más timeframes = más storage
- Aggregación puede ser costosa
- ¿Realmente necesitamos < 1h?

---

### DEC-008: Retención de Datos
**Fecha**: 15/06/2025  
**Estado**: Pendiente  
**Propuesta**:
- Order Flow: 24 horas (alta frecuencia)
- Volume Profile 1h: 7 días
- Volume Profile 1D: 30 días
- Resúmenes semanales: 1 año

**Storage estimado**: ~500MB/símbolo/mes

---

### DEC-009: Estrategia de exposición API en VPS compartido
**Fecha**: 15/06/2025  
**Estado**: Revisada  
**Contexto**: VPS tiene WordPress (80/443) y Plesk (8443).  
**Decisión**: Usar puerto no estándar 8920 con proxy inverso.  
**Implementación**: 
- Puerto interno Docker: 8080
- Puerto externo: 8920
- Nginx proxy: dominio.com:8920 → localhost:8080

**Consecuencias**:
- ✅ Evita conflictos con servicios existentes
- ✅ Fácil de recordar (89-20)
- ✅ Puede usar SSL propio o del dominio
- ❌ Requiere abrir puerto en firewall
- ❌ URL menos limpia (con puerto)

**Puertos alternativos considerados**:
- 9988 (backup)
- 12080 (alternativa)
- ~~8443~~ (usado por Plesk)
- ~~Subdirectorio~~ (complicaciones con MCP)

---

## 🤔 Decisiones Pendientes

1. **Símbolos a soportar inicialmente**
   - ¿Solo BTC, ETH, SOL?
   - ¿Top 10 por volumen?
   - ¿Configurable?

2. **Frecuencia de actualización local**
   - ¿Polling cada 1 min?
   - ¿Push notifications?
   - ¿Configurable por usuario?

3. **Formato de respuesta API**
   - ¿JSON puro?
   - ¿MessagePack para eficiencia?
   - ¿Compresión gzip?

4. **Monitoreo y Alertas**
   - ¿Grafana + Prometheus?
   - ¿Simple logging?
   - ¿Telegram alerts?

---

*Última actualización: 15/06/2025*
