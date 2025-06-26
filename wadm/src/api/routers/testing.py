"""
Testing router for FASE 3 security components
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import asyncio

from ..services.llm.llm_service import LLMService
from ..services.llm.models import ChatRequest, LLMProvider
from src.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/llm-security-test")
async def test_llm_security_components() -> Dict[str, Any]:
    """
    Test all FASE 3 security components
    """
    try:
        llm_service = LLMService()
        
        results = {
            "timestamp": "2025-06-26T01:59:00",
            "test_results": {}
        }
        
        # Test 1: Redis Rate Limiter
        try:
            if llm_service.rate_limiter:
                rate_limiter_health = llm_service.rate_limiter.health_check()
                results["test_results"]["redis_rate_limiter"] = {
                    "status": "enabled",
                    "health": rate_limiter_health
                }
            else:
                results["test_results"]["redis_rate_limiter"] = {
                    "status": "disabled",
                    "health": {"status": "not_initialized"}
                }
        except Exception as e:
            results["test_results"]["redis_rate_limiter"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Test 2: MongoDB Audit Logger
        try:
            if llm_service.audit_logger:
                audit_logger_health = llm_service.audit_logger.health_check()
                results["test_results"]["mongodb_audit_logger"] = {
                    "status": "enabled",
                    "health": audit_logger_health
                }
            else:
                results["test_results"]["mongodb_audit_logger"] = {
                    "status": "disabled",
                    "health": {"status": "not_initialized"}
                }
        except Exception as e:
            results["test_results"]["mongodb_audit_logger"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Test 3: Data Sanitizer
        try:
            if llm_service.sanitizer:
                sanitizer_health = llm_service.sanitizer.health_check()
                
                # Test sanitization
                test_text = "Contact me at john.doe@example.com or call 555-1234. My API key is abc123def456ghi789. <script>alert('test')</script>"
                sanitized = llm_service.sanitizer._remove_pii(test_text)
                sanitized = llm_service.sanitizer._remove_malicious_content(sanitized)
                
                results["test_results"]["data_sanitizer"] = {
                    "status": "enabled",
                    "health": sanitizer_health,
                    "test_sanitization": {
                        "original_length": len(test_text),
                        "sanitized_length": len(sanitized),
                        "sanitized_content": sanitized[:100] + "..." if len(sanitized) > 100 else sanitized
                    }
                }
            else:
                results["test_results"]["data_sanitizer"] = {
                    "status": "disabled",
                    "health": {"status": "not_initialized"}
                }
        except Exception as e:
            results["test_results"]["data_sanitizer"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Test 4: Rate Limit Check
        try:
            if llm_service.rate_limiter:
                is_allowed, limits_info = llm_service.rate_limiter.check_limits("test_user")
                results["test_results"]["rate_limit_check"] = {
                    "is_allowed": is_allowed,
                    "limits_info": limits_info
                }
            else:
                results["test_results"]["rate_limit_check"] = {
                    "is_allowed": True,
                    "note": "Rate limiter disabled"
                }
        except Exception as e:
            results["test_results"]["rate_limit_check"] = {
                "error": str(e)
            }
        
        # Overall status
        enabled_components = [
            results["test_results"]["redis_rate_limiter"]["status"] == "enabled",
            results["test_results"]["mongodb_audit_logger"]["status"] == "enabled", 
            results["test_results"]["data_sanitizer"]["status"] == "enabled"
        ]
        
        results["fase3_implementation"] = {
            "total_components": 3,
            "enabled_components": sum(enabled_components),
            "completion_percentage": (sum(enabled_components) / 3) * 100,
            "overall_status": "operational" if sum(enabled_components) >= 2 else "degraded"
        }
        
        return results
        
    except Exception as e:
        logger.error(f"Error testing LLM security components: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.post("/llm-security-demo")
async def demo_llm_security_flow() -> Dict[str, Any]:
    """
    Demonstrate complete LLM security flow with sanitization
    """
    try:
        llm_service = LLMService()
        
        # Create test request with PII and potential threats
        test_request = ChatRequest(
            message="Hi, analyze BTCUSDT for me. My email is john@example.com and my phone is 555-1234. Also check this <script>alert('test')</script> and my API key is sk-1234567890abcdef1234567890abcdef",
            symbol="BTCUSDT",
            provider=LLMProvider.DEMO,
            include_indicators=True,
            include_market_data=True
        )
        
        # Process through security components
        security_log = {
            "original_request": {
                "message": test_request.message,
                "message_length": len(test_request.message)
            }
        }
        
        # Test sanitization
        if llm_service.sanitizer:
            # Use existing sanitizer interface
            sanitized_message = llm_service.sanitizer.sanitize_text(test_request.message)
            
            security_log["sanitization"] = {
                "sanitized_message": sanitized_message,
                "sanitized_length": len(sanitized_message),
                "reduction_ratio": (len(test_request.message) - len(sanitized_message)) / len(test_request.message) if test_request.message else 0
            }
        
        # Test rate limiting
        if llm_service.rate_limiter:
            is_allowed, limits_info = llm_service.rate_limiter.check_limits("demo_user")
            security_log["rate_limiting"] = {
                "is_allowed": is_allowed,
                "limits": limits_info
            }
        
        # Test audit logging
        if llm_service.audit_logger:
            audit_id = llm_service.audit_logger.log_request("demo_user", test_request)
            security_log["audit_logging"] = {
                "audit_id": audit_id,
                "logged": bool(audit_id)
            }
        
        return {
            "demo_name": "FASE 3 Security Flow Demonstration",
            "timestamp": "2025-06-26T02:00:00",
            "security_log": security_log,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Error in LLM security demo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Demo failed: {str(e)}")


@router.get("/llm-usage-stats/{user_id}")
async def get_user_usage_stats(user_id: str) -> Dict[str, Any]:
    """
    Get user usage statistics from Redis rate limiter
    """
    try:
        llm_service = LLMService()
        
        if llm_service.rate_limiter:
            stats = llm_service.rate_limiter.get_usage_stats(user_id)
            return {
                "user_id": user_id,
                "usage_stats": stats,
                "timestamp": "2025-06-26T02:00:00"
            }
        else:
            return {
                "user_id": user_id,
                "error": "Rate limiter not available",
                "timestamp": "2025-06-26T02:00:00"
            }
            
    except Exception as e:
        logger.error(f"Error getting usage stats for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {str(e)}")


@router.get("/llm-audit-history/{user_id}")
async def get_user_audit_history(user_id: str, limit: int = 10) -> Dict[str, Any]:
    """
    Get user audit history from MongoDB
    """
    try:
        llm_service = LLMService()
        
        if llm_service.audit_logger:
            history = llm_service.audit_logger.get_user_audit_history(user_id, limit=limit)
            return {
                "user_id": user_id,
                "audit_history": history,
                "record_count": len(history),
                "timestamp": "2025-06-26T02:00:00"
            }
        else:
            return {
                "user_id": user_id,
                "error": "Audit logger not available",
                "timestamp": "2025-06-26T02:00:00"
            }
            
    except Exception as e:
        logger.error(f"Error getting audit history for {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get audit history: {str(e)}") 