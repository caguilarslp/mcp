# ADR-003: LLM Integration Strategy for Market Analysis

**Date**: 2025-06-17  
**Status**: Proposed  
**Context**: WADM Project - AI-powered market analysis

## Context

WADM genera indicadores complejos que pueden beneficiarse enormemente de análisis mediante LLMs. La integración de IA puede proporcionar:
- Narrativas de mercado en lenguaje natural
- Detección de patrones complejos
- Análisis multi-timeframe automático
- Alertas contextualizadas
- Reportes ejecutivos automatizados

## Casos de Uso Principales

### 1. Análisis de Contexto de Mercado
- Interpretar confluencia de indicadores
- Identificar fase de Wyckoff actual
- Explicar actividad institucional detectada
- Generar narrativa de sesión

### 2. Detección de Patrones Avanzados
- Patrones que involucran múltiples indicadores
- Anomalías en comportamiento institucional
- Divergencias complejas multi-timeframe
- Setups de alta probabilidad

### 3. Alertas Inteligentes
- No solo "precio cruzó X nivel"
- Contexto completo: "Posible spring en fase de acumulación con absorción institucional en soporte"
- Priorización por probabilidad de éxito

### 4. Reportes Automatizados
- Resumen de sesión
- Análisis pre-market
- Identificación de niveles clave con contexto
- Comparación con días similares históricos

## Arquitectura Propuesta

### Opción 1: Multi-LLM Router (Recomendada)
**Stack**: FastAPI + LangChain + Multiple LLM APIs

```python
class LLMAnalyzer:
    def __init__(self):
        self.routers = {
            'pattern_detection': ClaudeAPI(),      # Mejor para patrones
            'market_narrative': GPT4API(),         # Mejor para narrativas
            'quick_alerts': GeminiAPI(),           # Rápido y eficiente
            'local_analysis': LlamaAPI()           # Privacidad
        }
```

**Pros**:
- Usa la mejor LLM para cada tarea
- Redundancia si una API falla
- Costo optimizado por tarea
- Flexibilidad máxima

**Cons**:
- Múltiples API keys
- Complejidad de routing
- Diferentes formatos de respuesta

### Opción 2: Single Provider
**Stack**: FastAPI + OpenAI/Anthropic API

**Pros**:
- Simplicidad
- Un solo proveedor
- Consistencia en respuestas

**Cons**:
- Dependencia de un proveedor
- Posibles limitaciones por modelo
- Sin optimización por tarea

### Opción 3: Hybrid Local + Cloud
**Stack**: FastAPI + Ollama (local) + Cloud APIs

**Pros**:
- Análisis frecuente local (gratis)
- Cloud para análisis complejos
- Privacidad para datos sensibles
- Costo optimizado

**Cons**:
- Requiere GPU para local
- Mantenimiento de modelos locales
- Calidad variable

## Implementación Técnica

### 1. Context Builder
```python
class MarketContextBuilder:
    def build_context(self, symbol: str, timeframe: str):
        return {
            "current_price": price,
            "indicators": {
                "volume_profile": vp.to_dict(),
                "order_flow": of.to_dict(),
                "market_structure": ms.to_dict(),
                "liquidity_map": lm.to_dict()
            },
            "recent_patterns": patterns,
            "timeframe_alignment": mtf_analysis,
            "session_context": session_info
        }
```

### 2. Prompt Templates
```python
PATTERN_DETECTION_PROMPT = """
Analyze the following market data for {symbol}:

Current Market Structure: {market_structure}
Volume Profile: POC at {poc}, Value Area: {val}-{vah}
Order Flow: Delta {delta}, CVD {cvd}
Smart Money Activity: {smart_money_score}

Identify any institutional patterns or potential setups.
Focus on Wyckoff principles and Smart Money Concepts.
"""

ALERT_GENERATION_PROMPT = """
Given the following market conditions, generate a concise alert:
{context}

Requirements:
- One sentence summary
- Actionable insight
- Probability assessment
- Key levels to watch
"""
```

### 3. Analysis Pipeline
```python
async def analyze_market(symbol: str):
    # 1. Gather context
    context = await build_market_context(symbol)
    
    # 2. Route to appropriate LLM
    if context['volatility'] > threshold:
        analysis = await llm_router.analyze_high_volatility(context)
    else:
        analysis = await llm_router.standard_analysis(context)
    
    # 3. Post-process and validate
    validated = validate_llm_output(analysis)
    
    # 4. Store and distribute
    await store_analysis(validated)
    await broadcast_to_websocket(validated)
```

## Casos de Uso Específicos

### 1. Spring Detection Alert
```
Input: Price sweep below support with immediate recovery + high volume
LLM Output: "Potential Wyckoff Spring detected at $45,230. 
            Institutional absorption visible with 3.2x average volume. 
            Watch for follow-through above $45,500 for confirmation. 
            85% historical success rate for similar setups."
```

### 2. Session Analysis Report
```
Input: Full session data with all indicators
LLM Output: "London session showed clear accumulation pattern.
            Smart money footprint detected at $45,100-$45,300.
            Volume profile suggests unfinished business at $45,800.
            NY session likely to test this level. 
            Key: Monitor order flow above VWAP for continuation."
```

### 3. Multi-Timeframe Confluence
```
Input: 4H, 1H, 15m timeframe data
LLM Output: "Strong bullish confluence detected:
            - 4H: Accumulation phase C
            - 1H: Spring confirmed with volume
            - 15m: Order flow absorption at support
            Recommended: Long positions on pullbacks to $45,400."
```

## Costos Estimados

### Por 1000 análisis/día:
- **Claude 3.5**: ~$15/día (patrones complejos)
- **GPT-4**: ~$20/día (narrativas)
- **Gemini 1.5**: ~$5/día (alertas rápidas)
- **Llama 3 (local)**: $0 + electricidad

### Estrategia de Optimización:
1. Cache de análisis similares
2. Batch processing cada 5 minutos
3. Local para análisis frecuentes
4. Cloud solo para decisiones críticas

## Consideraciones de Seguridad

1. **No compartir**:
   - Posiciones actuales
   - Estrategias propietarias
   - Datos de usuarios

2. **Sanitización**:
   - Remover información sensible
   - Anonimizar símbolos si necesario
   - Limitar contexto histórico

3. **Rate Limiting**:
   - Máximo análisis por minuto
   - Circuit breakers
   - Fallback a análisis local

## Recomendación

Implementar **Opción 1: Multi-LLM Router** con:
- Claude para detección de patrones Wyckoff
- GPT-4 para narrativas de mercado
- Llama 3 local para análisis frecuentes
- Gemini para alertas rápidas

Esto optimiza costo/calidad y proporciona redundancia.

## Fases de Implementación

### Fase 1: MVP (1 semana)
- Integración básica con un LLM
- Alertas simples
- Context builder básico

### Fase 2: Multi-LLM (2 semanas)
- Router inteligente
- Optimización por tarea
- Cache system

### Fase 3: Advanced (1 mes)
- Fine-tuning local
- Backtesting de predicciones
- Feedback loop para mejorar

## Referencias
- [LangChain Multi-LLM](https://python.langchain.com/docs/guides/multiple_llms)
- [Ollama Local LLMs](https://ollama.ai/)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
