"""Test configuration"""

import asyncio
import pytest
from typing import AsyncGenerator

from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.presentation.api.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_settings(mocker):
    """Mock application settings."""
    return mocker.patch("src.core.config.get_settings")
