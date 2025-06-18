"""
Test health endpoints
"""

import pytest
from fastapi import status


def test_health_endpoint(client):
    """Test basic health endpoint."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


def test_ping_endpoint(client):
    """Test ping endpoint."""
    response = client.get("/ping")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"ping": "pong"}


def test_health_head_endpoint(client):
    """Test HEAD health endpoint."""
    response = client.head("/health")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
async def test_detailed_health_endpoint(async_client, mocker):
    """Test detailed health endpoint with mocked dependencies."""
    # Mock MongoDB health check
    mock_mongodb = mocker.AsyncMock()
    mock_mongodb.health_check.return_value = {
        "status": "healthy",
        "ping": True,
        "version": "7.0.0"
    }
    
    # Mock Redis health check
    mock_redis = mocker.AsyncMock()
    mock_redis.health_check.return_value = {
        "status": "healthy",
        "ping": True,
        "version": "7.0.0"
    }
    
    # Patch app state
    mocker.patch.object(async_client._transport.app.state, 'mongodb', mock_mongodb)
    mocker.patch.object(async_client._transport.app.state, 'redis', mock_redis)
    
    response = await async_client.get("/health/detailed")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "dependencies" in data
    assert data["dependencies"]["mongodb"]["status"] == "healthy"
    assert data["dependencies"]["redis"]["status"] == "healthy"
