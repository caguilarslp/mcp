"""
SMC Router
Placeholder for Smart Money Concepts endpoints
"""

from fastapi import APIRouter, Depends
from src.api.routers.auth import verify_api_key

router = APIRouter()

@router.get("/")
async def smc_info(api_key: str = Depends(verify_api_key)):
    """
    SMC endpoint info
    """
    return {
        "endpoints": [
            "/analysis/{symbol}",
            "/signals/{symbol}",
            "/order-blocks/{symbol}",
            "/fair-value-gaps/{symbol}"
        ],
        "message": "Smart Money Concepts analysis endpoints"
    }
