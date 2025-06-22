"""
Indicators Router
Placeholder for indicator endpoints
"""

from fastapi import APIRouter, Depends
from src.api.routers.auth import verify_api_key

router = APIRouter()

@router.get("/")
async def indicators_info(api_key: str = Depends(verify_api_key)):
    """
    List available indicators
    """
    return {
        "available": [
            "volume-profile",
            "order-flow",
            "smc"
        ],
        "message": "Use /api/v1/indicators/{indicator}/{symbol} to get data"
    }
