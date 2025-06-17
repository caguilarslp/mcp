"""Base WebSocket client module."""

from .client import BaseWebSocketClient
from .exceptions import WebSocketError, ConnectionLostError, ReconnectError

__all__ = [
    "BaseWebSocketClient",
    "WebSocketError", 
    "ConnectionLostError",
    "ReconnectError"
]
