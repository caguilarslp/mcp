"""
Simple logging setup
"""
import logging
import sys
from datetime import datetime
from pathlib import Path
from src.config import LOG_LEVEL, LOGS_DIR

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

# File handler - daily rotation
log_file = LOGS_DIR / f"wadm_{datetime.now().strftime('%Y%m%d')}.log"
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(formatter)

# Configure root logger
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    handlers=[console_handler, file_handler]
)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)
