# 📋 Cloud MarketData Task Tracker

## 🎯 Tareas Activas

### TASK-001: Setup Inicial Docker + FastAPI + FastMCP
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: CRÍTICA
- **Estimación**: 2 horas
- **Descripción**: Configurar entorno base con Docker, FastAPI y FastMCP
- **Entregables**:
  - [ ] Dockerfile con Python 3.12-slim
  - [ ] docker-compose.yml con todos los servicios
  - [ ] FastAPI app básica con health check
  - [ ] FastMCP server skeleton
  - [ ] Makefile para comandos comunes
- **Dependencias**: Ninguna
- **Notas**: Base para todo el desarrollo posterior

---

## 📅 Backlog Priorizado

### TASK-002: WebSocket Collectors Bybit/Binance
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: ALTA
- **Estimación**: 4 horas
- **Descripción**: Implementar collectors para trades y orderbook
- **Entregables**:
  - [ ] Abstract WebSocket collector base
  - [ ] Bybit v5 trades collector
  - [ ] Bybit v5 orderbook collector
  - [ ] Binance trades collector
  - [ ] Binance orderbook collector
  - [ ] Sistema de reconnection automático
- **Dependencias**: TASK-001
- **Notas**: Manejar rate limits y disconnections

### TASK-003: MongoDB Schema y Repositories
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: ALTA
- **Estimación**: 3 horas
- **Descripción**: Diseñar schema y capa de persistencia
- **Entregables**:
  - [ ] Schema para trades collection
  - [ ] Schema para orderbook snapshots
  - [ ] Schema para volume profile agregado
  - [ ] Schema para order flow metrics
  - [ ] Repository pattern implementation
  - [ ] TTL indexes para auto-cleanup
- **Dependencias**: TASK-001
- **Notas**: Optimizar para queries de rango temporal

### TASK-004: Volume Profile Calculator Service
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: ALTA
- **Estimación**: 4 horas
- **Descripción**: Servicio para calcular Volume Profile
- **Entregables**:
  - [ ] VolumeProfile entity model
  - [ ] Calculator service con algoritmos
  - [ ] POC, VAH, VAL detection
  - [ ] Aggregation por timeframes
  - [ ] Cache strategy con Redis
- **Dependencias**: TASK-002, TASK-003
- **Notas**: Optimizar para cálculo incremental

### TASK-005: Order Flow Analyzer Service
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: ALTA
- **Estimación**: 4 horas
- **Descripción**: Servicio para analizar Order Flow
- **Entregables**:
  - [ ] OrderFlow entity model
  - [ ] Delta calculator (buy vs sell)
  - [ ] Absorption detection
  - [ ] Imbalance zones identification
  - [ ] Real-time streaming vía Redis
- **Dependencias**: TASK-002, TASK-003
- **Notas**: Balance entre precisión y performance

### TASK-006: Data Retention y Cleanup System
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: MEDIA
- **Estimación**: 3 horas
- **Descripción**: Sistema automático de limpieza de datos
- **Entregables**:
  - [ ] Retention policies configuration
  - [ ] Celery tasks para cleanup
  - [ ] Archiving strategy (compress old data)
  - [ ] Monitoring de uso de storage
  - [ ] Alertas de espacio bajo
- **Dependencias**: TASK-003
- **Notas**: Crítico para VPS con storage limitado

### TASK-007: FastMCP Server Implementation
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: ALTA
- **Estimación**: 3 horas
- **Descripción**: Implementar servidor MCP completo
- **Entregables**:
  - [ ] MCP tools para volume profile
  - [ ] MCP tools para order flow
  - [ ] MCP tools para market depth
  - [ ] Rate limiting y auth
  - [ ] Documentation automática
- **Dependencias**: TASK-004, TASK-005
- **Notas**: Compatible con wAIckoff MCP client

### TASK-008: Integration Tests y Monitoring
- **Estado**: 🔴 PENDIENTE
- **Prioridad**: MEDIA
- **Estimación**: 2 horas
- **Descripción**: Suite de tests y observabilidad
- **Entregables**:
  - [ ] Integration tests con pytest
  - [ ] Prometheus metrics
  - [ ] Grafana dashboards
  - [ ] Health checks detallados
  - [ ] Performance benchmarks
- **Dependencias**: TASK-007
- **Notas**: CI/CD ready

---

## ✅ Tareas Completadas
*(Ninguna aún - proyecto recién iniciado)*

---

## 📊 Métricas del Proyecto
- **Total Tareas**: 8
- **Completadas**: 0 (0%)
- **En Progreso**: 0
- **Pendientes**: 8
- **Horas Estimadas**: 25h
- **Horas Reales**: 0h

---

## 🔄 Última Actualización
- **Fecha**: 2025-06-13
- **Por**: Sistema de inicialización
- **Cambios**: Creación inicial del task tracker
