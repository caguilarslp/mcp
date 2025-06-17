"""WebSocket client exceptions."""

from typing import Optional


class WebSocketError(Exception):
    """Base exception for WebSocket errors."""
    
    def __init__(self, message: str, code: Optional[int] = None):
        super().__init__(message)
        self.code = code


class ConnectionLostError(WebSocketError):
    """Raised when WebSocket connection is lost."""
    pass


class ReconnectError(WebSocketError):
    """Raised when reconnection attempts fail."""
    
    def __init__(self, message: str, attempts: int):
        super().__init__(message)
        self.attempts = attempts
