"""
WebSocket Collectors Package

Sistema de recopilación de datos de mercado vía WebSocket
con patrón template para múltiples exchanges.
"""

from .base import WebSocketCollector, CollectorStatus

__all__ = [
    "WebSocketCollector", 
    "CollectorStatus",
]
