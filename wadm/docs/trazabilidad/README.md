# 📊 WADM - wAIckoff Data Manager

## 📋 Descripción del Proyecto

**WADM** es un sistema de recolección y distribución de indicadores de mercado (Volume Profile y Order Flow) diseñado para alimentar el ecosistema wAIckoff con datos procesados de alta calidad.

## 🎯 Objetivos

1. **Recolectar** datos de WebSocket de Binance y Bybit 24/7
2. **Procesar** Volume Profile y Order Flow en tiempo real
3. **Almacenar** indicadores calculados (no datos raw) en MongoDB
4. **Distribuir** datos a través de MCP seguro con autenticación
5. **Cachear** localmente en máquinas cliente para optimizar consumo

## 🏗️ Arquitectura

```
VPS (Docker) → MCP Server → MCP Client → waickoff_reports/indicators/
```

## 📁 Estructura del Proyecto

```
wadm/
├── docs/
│   ├── trazabilidad/
│   │   ├── README.md (este archivo)
│   │   ├── tareas.md
│   │   ├── decisiones.md
│   │   └── progreso.md
│   ├── arquitectura/
│   └── api/
├── docker/
│   ├── docker-compose.yml
│   ├── collectors/
│   └── mcp-server/
├── src/
│   ├── collectors/
│   │   ├── binance/
│   │   └── bybit/
│   ├── processors/
│   ├── mcp-server/
│   └── mcp-client/
└── tests/
```

## 🔧 Stack Tecnológico

- **Recolección**: Python + WebSocket
- **Procesamiento**: Python + pandas/numpy
- **Almacenamiento**: MongoDB
- **Distribución**: MCP Protocol over HTTPS
- **Containerización**: Docker + Docker Compose
- **Seguridad**: API Keys + Let's Encrypt SSL

## 📊 Indicadores a Implementar

### Volume Profile
- Point of Control (POC)
- Value Area High (VAH)
- Value Area Low (VAL)
- Volume por nivel de precio

### Order Flow
- Delta (Buy Volume - Sell Volume)
- Delta Acumulativo
- Imbalance Ratio
- Large Trades Detection

## 🚀 Inicio Rápido

Ver [tareas.md](tareas.md) para el plan de implementación.

---

*Proyecto iniciado: 15/06/2025*
