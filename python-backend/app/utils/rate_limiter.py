"""Rate limiting utilities for API endpoints."""

import time
from functools import wraps
from typing import Callable, Optional, TypeVar, ParamSpec
from collections import defaultdict
import threading

from fastapi import HTTPException, Request

P = ParamSpec('P')
T = TypeVar('T')


class RateLimiter:
    """Token bucket rate limiter.
    
    Allows burst traffic while enforcing average rate limits.
    
    Example:
        limiter = RateLimiter(rate=10, per=60)  # 10 requests per 60 seconds
        if limiter.is_allowed("user_123"):
            process_request()
        else:
            reject_request()
    """
    
    def __init__(
        self,
        rate: int,
        per: float,
        burst: Optional[int] = None,
    ):
        """Initialize the rate limiter.
        
        Args:
            rate: Number of requests allowed
            per: Time period in seconds
            burst: Maximum burst size (defaults to rate)
        """
        self._rate = rate
        self._per = per
        self._burst = burst or rate
        self._tokens: dict[str, float] = defaultdict(lambda: self._burst)
        self._last_update: dict[str, float] = defaultdict(time.time)
        self._lock = threading.RLock()
    
    def _refill_tokens(self, key: str) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self._last_update[key]
        
        # Add tokens based on elapsed time
        tokens_to_add = elapsed * (self._rate / self._per)
        self._tokens[key] = min(self._burst, self._tokens[key] + tokens_to_add)
        self._last_update[key] = now
    
    def is_allowed(self, key: str, tokens: int = 1) -> bool:
        """Check if a request is allowed.
        
        Args:
            key: Unique identifier (e.g., user ID, IP address)
            tokens: Number of tokens to consume (default 1)
            
        Returns:
            True if allowed, False if rate limited
        """
        with self._lock:
            self._refill_tokens(key)
            
            if self._tokens[key] >= tokens:
                self._tokens[key] -= tokens
                return True
            return False
    
    def get_retry_after(self, key: str) -> float:
        """Get the time until the next request is allowed.
        
        Args:
            key: Unique identifier
            
        Returns:
            Seconds until next allowed request
        """
        with self._lock:
            self._refill_tokens(key)
            
            if self._tokens[key] >= 1:
                return 0
            
            # Calculate time to get 1 token
            tokens_needed = 1 - self._tokens[key]
            return tokens_needed * (self._per / self._rate)
    
    def reset(self, key: str) -> None:
        """Reset tokens for a key."""
        with self._lock:
            self._tokens[key] = self._burst
            self._last_update[key] = time.time()
    
    def cleanup(self, max_age: float = 3600) -> int:
        """Remove stale entries older than max_age seconds.
        
        Args:
            max_age: Maximum age in seconds
            
        Returns:
            Number of entries removed
        """
        with self._lock:
            now = time.time()
            stale_keys = [
                key for key, last_update in self._last_update.items()
                if now - last_update > max_age
            ]
            for key in stale_keys:
                del self._tokens[key]
                del self._last_update[key]
            return len(stale_keys)


# Global rate limiters for different purposes
_rate_limiters: dict[str, RateLimiter] = {}


def get_rate_limiter(
    name: str,
    rate: int = 60,
    per: float = 60,
    burst: Optional[int] = None,
) -> RateLimiter:
    """Get or create a named rate limiter.
    
    Args:
        name: Unique name for the limiter
        rate: Requests allowed per period
        per: Period in seconds
        burst: Maximum burst size
        
    Returns:
        RateLimiter instance
    """
    if name not in _rate_limiters:
        _rate_limiters[name] = RateLimiter(rate=rate, per=per, burst=burst)
    return _rate_limiters[name]


def rate_limit(
    rate: int = 60,
    per: float = 60,
    key_func: Optional[Callable[[Request], str]] = None,
    limiter_name: Optional[str] = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Decorator to rate limit FastAPI endpoints.
    
    Args:
        rate: Requests allowed per period
        per: Period in seconds
        key_func: Function to extract rate limit key from request
        limiter_name: Name for the rate limiter
    
    Example:
        @app.get("/api/data")
        @rate_limit(rate=10, per=60)
        async def get_data(request: Request):
            return {"data": "value"}
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        nonlocal limiter_name
        if limiter_name is None:
            limiter_name = f"rate_limit:{func.__module__}.{func.__name__}"
        
        limiter = get_rate_limiter(limiter_name, rate=rate, per=per)
        
        @wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Extract request from args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get('request')
            
            # Get rate limit key
            if key_func and request:
                key = key_func(request)
            elif request:
                # Default: use client IP
                key = request.client.host if request.client else "unknown"
            else:
                key = "default"
            
            # Check rate limit
            if not limiter.is_allowed(key):
                retry_after = limiter.get_retry_after(key)
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(int(retry_after) + 1)},
                )
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Similar logic for sync functions
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get('request')
            
            if key_func and request:
                key = key_func(request)
            elif request:
                key = request.client.host if request.client else "unknown"
            else:
                key = "default"
            
            if not limiter.is_allowed(key):
                retry_after = limiter.get_retry_after(key)
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(int(retry_after) + 1)},
                )
            
            return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore
    
    return decorator
