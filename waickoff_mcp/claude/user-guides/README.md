# 📚 User Guides - wAIckoff MCP Server v1.9.0

## 🎯 GUÍA PRINCIPAL UNIFICADA

### 📖 [**USER_GUIDE_v1.9.0.md**](../../USER_GUIDE_v1.9.0.md)
**La guía completa y actualizada que incluye TODO lo que necesitas saber:**
- ✅ Sistema de Contexto Persistente (3 meses)
- ✅ 117+ herramientas con memoria histórica
- ✅ Configuración MongoDB y fallback
- ✅ Casos de uso con contexto
- ✅ Resolución de conflictos automática
- ✅ Mejores prácticas y troubleshooting

---

## 📋 Guías Especializadas (Referencias)

### 🚀 Inicio Rápido
- [Getting Started](getting-started.md) - Configuración inicial
- [Quick Reference](quick-reference.md) - Comandos básicos

### 📈 Análisis de Mercado
- [Complete User Guide](complete-user-guide.md) - 117+ herramientas detalladas
- [Technical Analysis Guide](technical-analysis-guide.md) - Indicadores técnicos
- [Technical Indicators Guide](technical-indicators-guide.md) - Fibonacci, Elliott, Bollinger
- [Smart Money Concepts Guide](smart-money-concepts-guide.md) - SMC completo

### 🔧 Herramientas Avanzadas
- [Context Management Guide](context-management-guide.md) - Sistema de contexto
- [Multi-Exchange Guide](multi-exchange-guide.md) - Análisis multi-exchange

## 🆕 Novedades v1.9.0

### Sistema de Contexto Persistente
- **3 meses de memoria** automática
- **MongoDB + Files** dual storage
- **Carga automática** de 90 días en cada análisis
- **Resolución de conflictos** basada en historia

### Cómo Funciona
```bash
# Cada análisis ahora:
1. Carga contexto histórico (90 días)
2. Ejecuta análisis enriquecido
3. Guarda para futuras referencias
4. Resuelve conflictos automáticamente
```

### Configuración
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=waickoff_mcp
ENABLE_CONTEXT_MANAGER=true
CONTEXT_RETENTION_DAYS=90
```

## 🚀 Empezar Ahora

**👉 Lee la [GUÍA PRINCIPAL v1.9.0](../../USER_GUIDE_v1.9.0.md) para todo lo que necesitas**

Las guías especializadas siguen disponibles para consultas específicas, pero la guía principal contiene toda la información actualizada y unificada.

---

*Sistema con memoria persistente - Cada análisis es más inteligente que el anterior*