"""
Data Sanitizer for LLM Service
Removes PII, malicious content, and ensures security compliance
"""

import re
import json
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from src.logger import get_logger

logger = get_logger(__name__)


class DataSanitizer:
    """
    Advanced data sanitizer for LLM requests
    Removes PII, malicious content, and ensures compliance
    """
    
    def __init__(self):
        """Initialize data sanitizer"""
        self.pii_patterns = self._build_pii_patterns()
        self.malicious_patterns = self._build_malicious_patterns()
        self.html_tags = re.compile(r'<[^>]+>')
        
        logger.debug("✅ Data sanitizer initialized")
    
    def _build_pii_patterns(self) -> Dict[str, re.Pattern]:
        """Build PII detection patterns"""
        return {
            # Email addresses
            "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            
            # Phone numbers (various formats)
            "phone": re.compile(r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'),
            
            # Credit card numbers (basic pattern)
            "credit_card": re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            
            # Social Security Numbers
            "ssn": re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
            
            # IP addresses
            "ip_address": re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
            
            # URLs with sensitive info
            "sensitive_url": re.compile(r'https?://[^\s]*(?:token|key|password|secret)[^\s]*', re.IGNORECASE),
            
            # API keys and tokens (common patterns)
            "api_key": re.compile(r'(?:api[_-]?key|token|secret)[_-]?[:=]\s*["\']?([a-zA-Z0-9_-]{20,})["\']?', re.IGNORECASE),
            
            # Cryptocurrency addresses (Bitcoin, Ethereum)
            "crypto_address": re.compile(r'\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b')
        }
    
    def _build_malicious_patterns(self) -> Dict[str, re.Pattern]:
        """Build malicious content patterns"""
        return {
            # SQL injection attempts
            "sql_injection": re.compile(r'(?:union\s+select|or\s+1\s*=\s*1|drop\s+table|delete\s+from)', re.IGNORECASE),
            
            # XSS attempts
            "xss": re.compile(r'<script|javascript:|vbscript:|onload\s*=|onerror\s*=', re.IGNORECASE),
            
            # Command injection
            "command_injection": re.compile(r'[;&|`$(){}[\]\\]'),
            
            # Path traversal
            "path_traversal": re.compile(r'\.\.[\\/]|%2e%2e[\\/]', re.IGNORECASE),
            
            # Excessive special characters
            "excessive_special": re.compile(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]{10,}')
        }
    
    def sanitize_request_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize request data
        
        Args:
            data: Request data dictionary
            
        Returns:
            Sanitized data dictionary
        """
        try:
            sanitized = {}
            
            for key, value in data.items():
                if isinstance(value, str):
                    sanitized[key] = self._sanitize_string(value, key)
                elif isinstance(value, dict):
                    sanitized[key] = self.sanitize_request_data(value)
                elif isinstance(value, list):
                    sanitized[key] = self._sanitize_list(value)
                else:
                    sanitized[key] = value
            
            return sanitized
            
        except Exception as e:
            logger.error(f"Error sanitizing request data: {str(e)}")
            return data
    
    def _sanitize_string(self, text: str, context: str = "") -> str:
        """
        Sanitize string content
        
        Args:
            text: Text to sanitize
            context: Context of the text (field name)
            
        Returns:
            Sanitized text
        """
        if not text or not isinstance(text, str):
            return text
        
        sanitized = text
        
        try:
            # 1. Remove HTML tags
            sanitized = self.html_tags.sub('', sanitized)
            
            # 2. Handle PII based on context
            if context.lower() in ['message', 'query', 'prompt']:
                sanitized = self._remove_pii(sanitized)
            
            # 3. Remove malicious patterns
            sanitized = self._remove_malicious_content(sanitized)
            
            # 4. Normalize whitespace
            sanitized = re.sub(r'\s+', ' ', sanitized).strip()
            
            # 5. Limit length
            max_length = 10000  # 10K characters max
            if len(sanitized) > max_length:
                sanitized = sanitized[:max_length] + "..."
                logger.warning(f"Truncated long text in {context}: {len(text)} -> {len(sanitized)}")
            
            return sanitized
            
        except Exception as e:
            logger.error(f"Error sanitizing string: {str(e)}")
            return text
    
    def _sanitize_list(self, items: List[Any]) -> List[Any]:
        """Sanitize list items"""
        sanitized = []
        
        for item in items:
            if isinstance(item, str):
                sanitized.append(self._sanitize_string(item))
            elif isinstance(item, dict):
                sanitized.append(self.sanitize_request_data(item))
            elif isinstance(item, list):
                sanitized.append(self._sanitize_list(item))
            else:
                sanitized.append(item)
        
        return sanitized
    
    def _remove_pii(self, text: str) -> str:
        """Remove personally identifiable information"""
        sanitized = text
        replacements_made = []
        
        for pii_type, pattern in self.pii_patterns.items():
            matches = pattern.findall(sanitized)
            if matches:
                replacements_made.append(f"{pii_type}: {len(matches)}")
                
                # Replace with placeholder
                if pii_type == "email":
                    sanitized = pattern.sub("[EMAIL_REDACTED]", sanitized)
                elif pii_type == "phone":
                    sanitized = pattern.sub("[PHONE_REDACTED]", sanitized)
                elif pii_type == "credit_card":
                    sanitized = pattern.sub("[CARD_REDACTED]", sanitized)
                elif pii_type == "ssn":
                    sanitized = pattern.sub("[SSN_REDACTED]", sanitized)
                elif pii_type == "ip_address":
                    sanitized = pattern.sub("[IP_REDACTED]", sanitized)
                elif pii_type == "sensitive_url":
                    sanitized = pattern.sub("[URL_REDACTED]", sanitized)
                elif pii_type == "api_key":
                    sanitized = pattern.sub("[API_KEY_REDACTED]", sanitized)
                elif pii_type == "crypto_address":
                    sanitized = pattern.sub("[CRYPTO_ADDR_REDACTED]", sanitized)
        
        if replacements_made:
            logger.info(f"PII removed: {', '.join(replacements_made)}")
        
        return sanitized
    
    def _remove_malicious_content(self, text: str) -> str:
        """Remove malicious content patterns"""
        sanitized = text
        threats_detected = []
        
        for threat_type, pattern in self.malicious_patterns.items():
            if pattern.search(sanitized):
                threats_detected.append(threat_type)
                
                # Remove or neutralize based on threat type
                if threat_type == "sql_injection":
                    sanitized = pattern.sub("[SQL_BLOCKED]", sanitized)
                elif threat_type == "xss":
                    sanitized = pattern.sub("[XSS_BLOCKED]", sanitized)
                elif threat_type == "command_injection":
                    # Remove dangerous characters but keep content readable
                    sanitized = re.sub(r'[;&|`$]', '', sanitized)
                    sanitized = re.sub(r'[(){}[\]\\]', ' ', sanitized)
                elif threat_type == "path_traversal":
                    sanitized = pattern.sub("[PATH_BLOCKED]", sanitized)
                elif threat_type == "excessive_special":
                    # Limit consecutive special characters
                    sanitized = re.sub(r'([!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]){5,}', 
                                     r'\1\1\1', sanitized)
        
        if threats_detected:
            logger.warning(f"Malicious content detected and neutralized: {', '.join(threats_detected)}")
        
        return sanitized
    
    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        """
        Detect PII in text without removing it
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary of detected PII types and counts
        """
        detected = {}
        
        for pii_type, pattern in self.pii_patterns.items():
            matches = pattern.findall(text)
            if matches:
                # Don't log actual PII values, just counts
                detected[pii_type] = [f"[REDACTED_{i}]" for i in range(len(matches))]
        
        return detected
    
    def validate_clean_data(self, original: str, sanitized: str) -> Dict[str, Any]:
        """
        Validate that sanitization was appropriate
        
        Args:
            original: Original text
            sanitized: Sanitized text
            
        Returns:
            Validation results
        """
        try:
            # Calculate reduction ratio
            length_reduction = (len(original) - len(sanitized)) / len(original) if original else 0
            
            # Check for excessive reduction
            excessive_reduction = length_reduction > 0.7  # More than 70% removed
            
            # Check if critical trading content might have been removed
            trading_keywords = ["analyze", "symbol", "price", "technical", "market", "trading", "buy", "sell"]
            keywords_preserved = sum(1 for keyword in trading_keywords if keyword.lower() in sanitized.lower())
            keywords_total = sum(1 for keyword in trading_keywords if keyword.lower() in original.lower())
            
            keyword_preservation = (keywords_preserved / keywords_total) if keywords_total > 0 else 1.0
            
            return {
                "original_length": len(original),
                "sanitized_length": len(sanitized),
                "length_reduction_ratio": length_reduction,
                "excessive_reduction": excessive_reduction,
                "keyword_preservation_ratio": keyword_preservation,
                "is_valid": not excessive_reduction and keyword_preservation > 0.5
            }
            
        except Exception as e:
            logger.error(f"Error validating sanitization: {str(e)}")
            return {"is_valid": True, "error": str(e)}
    
    def sanitize_for_logging(self, data: Any, max_length: int = 200) -> str:
        """
        Sanitize data for safe logging
        
        Args:
            data: Data to sanitize for logging
            max_length: Maximum length for log entry
            
        Returns:
            Safe string for logging
        """
        try:
            # Convert to string
            if isinstance(data, dict):
                text = json.dumps(data, default=str)
            elif isinstance(data, list):
                text = str(data)
            else:
                text = str(data)
            
            # Remove PII
            sanitized = self._remove_pii(text)
            
            # Remove API keys and secrets
            sanitized = re.sub(r'["\']?(?:key|token|secret|password)["\']?\s*[:=]\s*["\']?[a-zA-Z0-9_-]{10,}["\']?', 
                             '[REDACTED]', sanitized, flags=re.IGNORECASE)
            
            # Truncate if too long
            if len(sanitized) > max_length:
                sanitized = sanitized[:max_length] + "..."
            
            return sanitized
            
        except Exception as e:
            logger.error(f"Error sanitizing for logging: {str(e)}")
            return "[SANITIZATION_ERROR]"
    
    def health_check(self) -> Dict[str, Any]:
        """Health check for data sanitizer"""
        try:
            # Test PII detection
            test_text = "Contact john@example.com at 555-1234"
            detected = self.detect_pii(test_text)
            pii_detection_works = "email" in detected and "phone" in detected
            
            # Test sanitization
            sanitized = self._remove_pii(test_text)
            sanitization_works = "[EMAIL_REDACTED]" in sanitized and "[PHONE_REDACTED]" in sanitized
            
            # Test malicious content detection
            malicious_text = "<script>alert('test')</script>"
            sanitized_malicious = self._remove_malicious_content(malicious_text)
            malicious_detection_works = "[XSS_BLOCKED]" in sanitized_malicious
            
            return {
                "status": "healthy" if all([pii_detection_works, sanitization_works, malicious_detection_works]) else "degraded",
                "pii_detection": pii_detection_works,
                "pii_sanitization": sanitization_works,
                "malicious_content_detection": malicious_detection_works
            }
            
        except Exception as e:
            logger.error(f"Data sanitizer health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            } 