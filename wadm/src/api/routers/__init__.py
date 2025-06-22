"""
API Routers
Organized endpoint groups
"""

from . import auth
from . import market_data
from . import indicators
from . import smc
from . import system

__all__ = ['auth', 'market_data', 'indicators', 'smc', 'system']
