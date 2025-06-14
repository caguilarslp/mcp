"""
Storage Handlers Package

Diferentes implementaciones de almacenamiento para trades
y otros datos de mercado.
"""

from .memory import InMemoryStorage

__all__ = [
    "InMemoryStorage",
]
