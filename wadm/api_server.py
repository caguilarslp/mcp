"""
FastAPI Server Runner
Standalone script to run the WADM API with environment configuration
"""

import os
import logging
import uvicorn
from src.api import create_app

# Configure logging based on environment
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Run the FastAPI application with environment configuration"""
    # Get configuration from environment variables
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', '8000'))
    debug = os.getenv('API_DEBUG', 'false').lower() == 'true'
    reload = os.getenv('API_RELOAD', 'false').lower() == 'true'
    workers = int(os.getenv('WORKERS', '1'))
    
    # Create app
    app = create_app()
    
    logger.info(f"Starting WADM API Server...")
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"Debug: {debug}")
    logger.info(f"Reload: {reload}")
    logger.info(f"Workers: {workers}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    # Run server
    if workers > 1 and not reload:
        # Production mode with multiple workers
        uvicorn.run(
            "src.api:create_app",
            factory=True,
            host=host,
            port=port,
            workers=workers,
            log_level=log_level.lower(),
            access_log=True
        )
    else:
        # Development mode or single worker
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level=log_level.lower(),
            access_log=True,
            reload=reload
        )

if __name__ == "__main__":
    main()
