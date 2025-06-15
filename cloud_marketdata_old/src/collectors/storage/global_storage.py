"""
Global Storage Instance

Singleton pattern para asegurar que todos los collectors usen
el mismo storage instance.
"""

from .memory import InMemoryStorage

# Global storage instance
_storage_instance = None

def get_global_storage() -> InMemoryStorage:
    """Get or create the global storage instance"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = InMemoryStorage()
    return _storage_instance

# Create instance on import
GLOBAL_STORAGE = get_global_storage()
