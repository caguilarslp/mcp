"""
Structured logging configuration for Cloud MarketData MCP Server

Provides JSON-formatted logging with context and performance tracking.
"""

import logging
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "context"):
            log_entry["context"] = record.context
            
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
            
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """
    Setup structured logger with JSON formatting
    
    Args:
        name: Logger name (usually __name__)
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers
    if logger.hasHandlers():
        return logger
        
    logger.setLevel(getattr(logging, level.upper()))
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


def log_with_context(logger: logging.Logger, level: str, message: str, 
                    context: Optional[Dict[str, Any]] = None) -> None:
    """
    Log message with additional context
    
    Args:
        logger: Logger instance
        level: Log level
        message: Log message
        context: Additional context dictionary
    """
    log_method = getattr(logger, level.lower())
    log_method(message, extra={"context": context} if context else {})


def log_performance(logger: logging.Logger, operation: str, duration_ms: float,
                   context: Optional[Dict[str, Any]] = None) -> None:
    """
    Log performance metrics
    
    Args:
        logger: Logger instance
        operation: Operation name
        duration_ms: Duration in milliseconds
        context: Additional context
    """
    extra = {
        "duration_ms": duration_ms,
        "context": context or {}
    }
    logger.info(f"Performance: {operation} completed", extra=extra)
