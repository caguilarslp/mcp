"""Common test fixtures."""

import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient

from src.presentation.api.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def async_client():
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_settings(mocker):
    """Mock settings for tests."""
    from src.core.config import Settings
    
    mock_settings = Settings(
        ENVIRONMENT="test",
        MONGODB_URL="mongodb://test:test@localhost:27017/test",
        REDIS_URL="redis://localhost:6379/0",
        API_KEY="test_api_key_12345",
        LOG_LEVEL="DEBUG"
    )
    
    mocker.patch("src.core.config.get_settings", return_value=mock_settings)
    return mock_settings
