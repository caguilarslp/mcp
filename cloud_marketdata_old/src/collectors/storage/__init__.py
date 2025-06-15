"""
Storage Handlers Package

Diferentes implementaciones de almacenamiento para trades
y otros datos de mercado.
"""

from .memory import InMemoryStorage
from .global_storage import GLOBAL_STORAGE, get_global_storage

__all__ = [
    "InMemoryStorage",
    "GLOBAL_STORAGE",
    "get_global_storage",
]
