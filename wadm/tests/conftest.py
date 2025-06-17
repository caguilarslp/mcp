"""Test configuration"""

import asyncio
import pytest
from typing import AsyncGenerator


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_settings(mocker):
    """Mock application settings."""
    return mocker.patch("src.core.config.get_config")
