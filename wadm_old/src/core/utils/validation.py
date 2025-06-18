"""Validation utilities."""

from decimal import Decimal
import re


def validate_symbol(symbol: str) -> bool:
    """Validate trading symbol format."""
    if not symbol:
        return False
    
    # Must be uppercase, letters only, ending with USDT
    pattern = r'^[A-Z]+USDT$'
    return bool(re.match(pattern, symbol))


def validate_price(price: Decimal) -> bool:
    """Validate price is positive."""
    return price > 0


def validate_quantity(quantity: Decimal) -> bool:
    """Validate quantity is positive."""
    return quantity > 0


def sanitize_symbol(symbol: str) -> str:
    """Sanitize symbol to standard format."""
    # Remove spaces
    symbol = symbol.strip()
    
    # Convert to uppercase
    symbol = symbol.upper()
    
    # Remove common separators
    symbol = symbol.replace('-', '')
    symbol = symbol.replace('/', '')
    symbol = symbol.replace('_', '')
    
    return symbol
