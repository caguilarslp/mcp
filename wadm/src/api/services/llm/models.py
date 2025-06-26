"""
LLM Service Models
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class LLMProvider(str, Enum):
    """Available LLM providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    symbol: str = Field(..., min_length=1, max_length=20, description="Trading symbol")
    provider: Optional[LLMProvider] = Field(None, description="Preferred LLM provider")
    include_indicators: bool = Field(True, description="Include indicator data in context")
    include_market_data: bool = Field(True, description="Include market data in context")


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str = Field(..., description="LLM response")
    provider_used: LLMProvider = Field(..., description="Provider that generated response")
    tokens_used: int = Field(..., description="Tokens consumed")
    cost_usd: float = Field(..., description="Cost in USD")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    context_symbols: List[str] = Field(default_factory=list, description="Symbols included in context")


class LLMUsageLog(BaseModel):
    """Usage logging model"""
    user_id: str
    query_preview: str = Field(..., max_length=100, description="First 100 chars of query")
    provider: LLMProvider
    tokens_used: int
    cost_usd: float
    success: bool
    error_message: Optional[str] = None
    processing_time_ms: int
    timestamp: Optional[str] = None


class LLMError(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    error_code: str = Field(..., description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details") 