"""
Configuration example for WebSocket collectors.
"""

import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src'))

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from core.types import Symbol, ExchangeName


@dataclass
class CollectorConfig:
    """Configuration for a single collector."""
    
    exchange: ExchangeName
    symbols: List[Symbol]
    max_reconnect_attempts: int = 10
    reconnect_delay: float = 5.0
    ping_interval: float = 20.0
    ping_timeout: float = 10.0
    enabled: bool = True


@dataclass
class CollectorManagerConfig:
    """Configuration for the collector manager."""
    
    auto_restart: bool = True
    restart_delay: float = 30.0
    health_check_interval: float = 30.0
    collectors: List[CollectorConfig] = field(default_factory=list)


# Example configurations
DEFAULT_SYMBOLS = [
    Symbol("BTCUSDT"),
    Symbol("ETHUSDT"),
    Symbol("SOLUSDT"),
    Symbol("ADAUSDT"),
    Symbol("DOTUSDT"),
]

MAJOR_PAIRS_ONLY = [
    Symbol("BTCUSDT"),
    Symbol("ETHUSDT"),
]

DeFi_TOKENS = [
    Symbol("UNIUSDT"),
    Symbol("AAVEUSDT"),
    Symbol("COMPUSDT"),
    Symbol("SUSHIUSDT"),
    Symbol("CRVUSDT"),
]

# Pre-defined configurations
PRODUCTION_CONFIG = CollectorManagerConfig(
    auto_restart=True,
    restart_delay=30.0,
    health_check_interval=60.0,
    collectors=[
        CollectorConfig(
            exchange=ExchangeName.BYBIT,
            symbols=DEFAULT_SYMBOLS,
            max_reconnect_attempts=20,
            reconnect_delay=10.0,
        ),
        CollectorConfig(
            exchange=ExchangeName.BINANCE,
            symbols=DEFAULT_SYMBOLS,
            max_reconnect_attempts=20,
            reconnect_delay=10.0,
        ),
    ]
)

DEVELOPMENT_CONFIG = CollectorManagerConfig(
    auto_restart=True,
    restart_delay=5.0,
    health_check_interval=30.0,
    collectors=[
        CollectorConfig(
            exchange=ExchangeName.BYBIT,
            symbols=MAJOR_PAIRS_ONLY,
            max_reconnect_attempts=3,
            reconnect_delay=2.0,
        ),
    ]
)

TESTING_CONFIG = CollectorManagerConfig(
    auto_restart=False,
    restart_delay=1.0,
    health_check_interval=10.0,
    collectors=[
        CollectorConfig(
            exchange=ExchangeName.BYBIT,
            symbols=[Symbol("BTCUSDT")],
            max_reconnect_attempts=1,
            reconnect_delay=0.5,
            ping_interval=10.0,
            ping_timeout=5.0,
        ),
    ]
)


def get_config(environment: str = "development") -> CollectorManagerConfig:
    """Get configuration for specified environment."""
    configs = {
        "production": PRODUCTION_CONFIG,
        "development": DEVELOPMENT_CONFIG,
        "testing": TESTING_CONFIG,
    }
    
    return configs.get(environment, DEVELOPMENT_CONFIG)


def create_collector_manager_from_config(
    config: CollectorManagerConfig,
    **callbacks
) -> 'CollectorManager':
    """Create a CollectorManager from configuration."""
    from infrastructure.collectors import CollectorManager
    
    manager = CollectorManager(
        auto_restart=config.auto_restart,
        restart_delay=config.restart_delay,
        **callbacks
    )
    
    # Note: Collectors need to be added separately as they require async context
    return manager


async def setup_collectors_from_config(
    manager: 'CollectorManager',
    config: CollectorManagerConfig
) -> List[str]:
    """Setup collectors from configuration. Returns collector IDs."""
    collector_ids = []
    
    for collector_config in config.collectors:
        if not collector_config.enabled:
            continue
        
        collector_id = await manager.add_exchange(
            exchange=collector_config.exchange,
            symbols=collector_config.symbols,
            max_reconnect_attempts=collector_config.max_reconnect_attempts,
            reconnect_delay=collector_config.reconnect_delay,
            ping_interval=collector_config.ping_interval,
            ping_timeout=collector_config.ping_timeout,
        )
        
        collector_ids.append(collector_id)
    
    return collector_ids


# Example usage functions
async def run_with_config(environment: str = "development", **callbacks):
    """Run collectors with specified configuration."""
    config = get_config(environment)
    
    manager = create_collector_manager_from_config(config, **callbacks)
    
    async with manager:
        collector_ids = await setup_collectors_from_config(manager, config)
        await manager.start_all()
        
        print(f"Started {len(collector_ids)} collectors for {environment} environment")
        return manager
