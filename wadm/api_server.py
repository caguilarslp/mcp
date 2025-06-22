"""
FastAPI Server Runner
Standalone script to run the WADM API
"""

import logging
import uvicorn
from src.api import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Run the FastAPI application"""
    app = create_app()
    
    logger.info("Starting WADM API Server...")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        reload=False  # Set to True for development
    )

if __name__ == "__main__":
    main()
