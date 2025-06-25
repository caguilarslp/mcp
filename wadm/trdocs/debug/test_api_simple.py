"""
Test API Server without MongoDB
Quick test to verify FastAPI is working
"""

import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create simple app
app = FastAPI(
    title="WADM API Test",
    description="Test API without MongoDB",
    version="1.0.0"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
async def root():
    return {
        "message": "WADM API Test Server",
        "status": "running",
        "mongodb": "not required for this test"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    logger.info("Starting test API server (no MongoDB required)...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
