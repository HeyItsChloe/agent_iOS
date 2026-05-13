"""Simple in-memory caching utilities."""

import time
from functools import wraps
from typing import Any, Callable, Optional, TypeVar, ParamSpec
from collections import OrderedDict
import threading

P = ParamSpec('P')
T = TypeVar('T')


class SimpleCache:
    """Thread-safe in-memory cache with TTL and LRU eviction.
    
    Example:
        cache = SimpleCache(max_size=100, default_ttl=60)
        cache.set("key", "value")
        value = cache.get("key")
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: Optional[float] = None):
        """Initialize the cache.
        
        Args:
            max_size: Maximum number of items in cache
            default_ttl: Default time-to-live in seconds (None = no expiry)
        """
        self._cache: OrderedDict[str, tuple[Any, Optional[float]]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.RLock()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from the cache.
        
        Args:
            key: Cache key
            default: Value to return if key not found or expired
            
        Returns:
            Cached value or default
        """
        with self._lock:
            if key not in self._cache:
                return default
            
            value, expires_at = self._cache[key]
            
            # Check if expired
            if expires_at is not None and time.time() > expires_at:
                del self._cache[key]
                return default
            
            # Move to end (LRU)
            self._cache.move_to_end(key)
            return value
    
    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (None = use default)
        """
        with self._lock:
            # Calculate expiration time
            effective_ttl = ttl if ttl is not None else self._default_ttl
            expires_at = time.time() + effective_ttl if effective_ttl else None
            
            # Remove if exists (to update order)
            if key in self._cache:
                del self._cache[key]
            
            # Evict oldest if at capacity
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)
            
            self._cache[key] = (value, expires_at)
    
    def delete(self, key: str) -> bool:
        """Delete a key from the cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key existed, False otherwise
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all items from the cache."""
        with self._lock:
            self._cache.clear()
    
    def cleanup(self) -> int:
        """Remove all expired items from the cache.
        
        Returns:
            Number of items removed
        """
        with self._lock:
            now = time.time()
            expired_keys = [
                key for key, (_, expires_at) in self._cache.items()
                if expires_at is not None and now > expires_at
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)
    
    def __len__(self) -> int:
        """Return the number of items in the cache."""
        return len(self._cache)
    
    def __contains__(self, key: str) -> bool:
        """Check if a key is in the cache (and not expired)."""
        return self.get(key, default=_MISSING) is not _MISSING


# Sentinel for missing values
class _Missing:
    pass

_MISSING = _Missing()


# Global cache instance
_global_cache = SimpleCache(max_size=1000, default_ttl=300)


def cached(
    ttl: Optional[float] = None,
    key_prefix: str = "",
    cache: Optional[SimpleCache] = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Decorator to cache function results.
    
    Args:
        ttl: Time-to-live in seconds
        key_prefix: Prefix for cache keys
        cache: Cache instance to use (defaults to global cache)
    
    Example:
        @cached(ttl=60)
        def expensive_function(arg1, arg2):
            return compute_result(arg1, arg2)
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Build cache key
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            target_cache = cache or _global_cache
            cached_value = target_cache.get(cache_key, default=_MISSING)
            
            if cached_value is not _MISSING:
                return cached_value
            
            # Compute and cache
            result = func(*args, **kwargs)
            target_cache.set(cache_key, result, ttl=ttl)
            return result
        
        # Add cache control methods
        wrapper.cache_clear = lambda: target_cache.clear()  # type: ignore
        wrapper.cache_info = lambda: {"size": len(target_cache)}  # type: ignore
        
        return wrapper
    return decorator


def get_global_cache() -> SimpleCache:
    """Get the global cache instance."""
    return _global_cache
