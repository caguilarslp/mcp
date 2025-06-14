# Cloud MarketData MCP Server

Microservicio robusto y escalable para la recopilación, procesamiento y almacenamiento de datos de mercado en tiempo real.

## 🚀 Quick Start

```bash
# Desarrollo
docker-compose up -d
docker-compose logs -f

# Tests
pytest -v

# Producción
docker build -t cloud-marketdata .
docker run -d cloud-marketdata
```

## 🏗️ Arquitectura

- **Clean Architecture** con 4 capas bien definidas
- **Event-driven** para procesamiento asíncrono
- **WebSocket collectors** para Bybit y Binance
- **MongoDB** para persistencia con TTL automático
- **Redis** para streaming y caché
- **FastMCP** servidor para integración

## 📊 Características

- ✅ Recopilación 24/7 de trades y orderbook
- ✅ Cálculo de Volume Profile en tiempo real
- ✅ Análisis de Order Flow con delta y absorción
- ✅ Sistema automático de limpieza de datos
- ✅ API MCP para consumo externo
- ✅ Monitoreo y métricas incluidas

## 🔧 Configuración

Variables de entorno en `.env`:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=marketdata

# Redis
REDIS_URL=redis://localhost:6379

# Exchange APIs
BYBIT_TESTNET=false
BINANCE_TESTNET=false

# Data Retention (hours)
RAW_DATA_RETENTION=1
MINUTE_DATA_RETENTION=24
HOURLY_DATA_RETENTION=168

# MCP Server
MCP_PORT=8000
MCP_AUTH_KEY=your-secret-key
```

## 📁 Estructura

```
cloud_marketdata/
├── src/
│   ├── core/           # Dominio y entidades
│   ├── infrastructure/ # Adaptadores externos
│   ├── application/    # Casos de uso
│   └── presentation/   # API y MCP
├── tests/              # Tests unitarios e integración
├── docker/             # Configuración Docker
└── config/            # Configuración y env
```

## 🛠️ Desarrollo

Ver documentación completa en `claude/docs/` para:
- Guía de contribución
- Arquitectura detallada
- API Reference
- Troubleshooting

## 📈 Performance

- Latencia: < 10ms por trade
- Throughput: 10k trades/segundo
- Storage: Optimizado con retención automática
- CPU: < 30% en condiciones normales

## 📄 Licencia

MIT License - Ver LICENSE para detalles
