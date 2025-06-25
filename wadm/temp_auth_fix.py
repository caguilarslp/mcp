"""
Temporary fix: Disable API key validation for MCP routes in development.
"""

# Add this to your src/api/routers/mcp.py file at the top after imports:

from fastapi import Request
from src.api.config import APIConfig

# Skip auth for development
def skip_auth_for_dev():
    """Skip authentication in development mode."""
    config = APIConfig()
    if config.ENVIRONMENT == "development":
        return True
    return False

# Or modify the middleware to skip MCP routes
# In src/api/middleware/rate_limit.py, add these paths to skip:
SKIP_PATHS = [
    "/",
    "/api/docs",
    "/api/redoc", 
    "/api/openapi.json",
    "/api/v1",
    "/api/v1/system/health",
    # Add MCP routes for development
    "/api/v1/mcp/health",
    "/api/v1/mcp/tools",
    "/api/v1/mcp/call",
]
