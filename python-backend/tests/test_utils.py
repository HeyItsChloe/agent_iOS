"""Tests for utility modules."""

import pytest
import time
from unittest.mock import MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.utils.cache import SimpleCache, cached, get_global_cache
from app.utils.rate_limiter import RateLimiter, get_rate_limiter


class TestSimpleCache:
    """Tests for SimpleCache."""

    def test_set_and_get(self):
        """Test basic set and get operations."""
        cache = SimpleCache()
        cache.set("key", "value")
        
        assert cache.get("key") == "value"

    def test_get_missing_key(self):
        """Test getting a non-existent key."""
        cache = SimpleCache()
        
        assert cache.get("missing") is None
        assert cache.get("missing", default="default") == "default"

    def test_ttl_expiration(self):
        """Test that items expire after TTL."""
        cache = SimpleCache()
        cache.set("key", "value", ttl=0.1)  # 100ms TTL
        
        assert cache.get("key") == "value"
        
        time.sleep(0.15)
        
        assert cache.get("key") is None

    def test_default_ttl(self):
        """Test default TTL on cache."""
        cache = SimpleCache(default_ttl=0.1)
        cache.set("key", "value")
        
        time.sleep(0.15)
        
        assert cache.get("key") is None

    def test_max_size_eviction(self):
        """Test LRU eviction when max size reached."""
        cache = SimpleCache(max_size=3)
        
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        cache.set("d", 4)  # Should evict 'a'
        
        assert cache.get("a") is None
        assert cache.get("b") == 2
        assert cache.get("c") == 3
        assert cache.get("d") == 4

    def test_lru_order(self):
        """Test that accessing items updates LRU order."""
        cache = SimpleCache(max_size=3)
        
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        
        # Access 'a' to make it most recently used
        cache.get("a")
        
        # Adding 'd' should evict 'b' (least recently used)
        cache.set("d", 4)
        
        assert cache.get("a") == 1
        assert cache.get("b") is None
        assert cache.get("c") == 3
        assert cache.get("d") == 4

    def test_delete(self):
        """Test deleting items."""
        cache = SimpleCache()
        cache.set("key", "value")
        
        assert cache.delete("key") is True
        assert cache.get("key") is None
        assert cache.delete("key") is False

    def test_clear(self):
        """Test clearing cache."""
        cache = SimpleCache()
        cache.set("a", 1)
        cache.set("b", 2)
        
        cache.clear()
        
        assert len(cache) == 0
        assert cache.get("a") is None

    def test_contains(self):
        """Test __contains__ method."""
        cache = SimpleCache()
        cache.set("key", "value")
        
        assert "key" in cache
        assert "missing" not in cache

    def test_len(self):
        """Test __len__ method."""
        cache = SimpleCache()
        
        assert len(cache) == 0
        
        cache.set("a", 1)
        cache.set("b", 2)
        
        assert len(cache) == 2


class TestCachedDecorator:
    """Tests for @cached decorator."""

    def test_caches_result(self):
        """Test that results are cached."""
        call_count = 0
        
        @cached(ttl=60)
        def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2
        
        result1 = expensive_function(5)
        result2 = expensive_function(5)
        
        assert result1 == 10
        assert result2 == 10
        assert call_count == 1

    def test_different_args_different_cache(self):
        """Test that different arguments use different cache keys."""
        call_count = 0
        
        @cached(ttl=60)
        def add(a: int, b: int) -> int:
            nonlocal call_count
            call_count += 1
            return a + b
        
        result1 = add(1, 2)
        result2 = add(3, 4)
        result3 = add(1, 2)  # Should hit cache
        
        assert result1 == 3
        assert result2 == 7
        assert result3 == 3
        assert call_count == 2


class TestRateLimiter:
    """Tests for RateLimiter."""

    def test_allows_within_limit(self):
        """Test that requests within limit are allowed."""
        limiter = RateLimiter(rate=10, per=1)
        
        for _ in range(10):
            assert limiter.is_allowed("user1") is True

    def test_blocks_over_limit(self):
        """Test that requests over limit are blocked."""
        limiter = RateLimiter(rate=5, per=1, burst=5)
        
        for _ in range(5):
            assert limiter.is_allowed("user1") is True
        
        assert limiter.is_allowed("user1") is False

    def test_different_keys_separate_limits(self):
        """Test that different keys have separate limits."""
        limiter = RateLimiter(rate=2, per=1, burst=2)
        
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is False
        
        # user2 should still have their full allocation
        assert limiter.is_allowed("user2") is True
        assert limiter.is_allowed("user2") is True

    def test_tokens_refill_over_time(self):
        """Test that tokens refill over time."""
        limiter = RateLimiter(rate=10, per=1, burst=2)
        
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is True
        assert limiter.is_allowed("user1") is False
        
        # Wait for tokens to refill
        time.sleep(0.3)
        
        assert limiter.is_allowed("user1") is True

    def test_get_retry_after(self):
        """Test get_retry_after returns correct time."""
        limiter = RateLimiter(rate=10, per=1, burst=1)
        
        limiter.is_allowed("user1")
        
        retry_after = limiter.get_retry_after("user1")
        
        assert retry_after > 0
        assert retry_after <= 0.1  # Should be around 0.1 seconds

    def test_reset(self):
        """Test resetting tokens for a key."""
        limiter = RateLimiter(rate=2, per=1, burst=2)
        
        limiter.is_allowed("user1")
        limiter.is_allowed("user1")
        assert limiter.is_allowed("user1") is False
        
        limiter.reset("user1")
        
        assert limiter.is_allowed("user1") is True


class TestGetRateLimiter:
    """Tests for get_rate_limiter factory."""

    def test_creates_new_limiter(self):
        """Test creating a new rate limiter."""
        limiter = get_rate_limiter("test1", rate=5, per=1)
        
        assert isinstance(limiter, RateLimiter)

    def test_returns_existing_limiter(self):
        """Test that same name returns same limiter."""
        limiter1 = get_rate_limiter("test2", rate=5, per=1)
        limiter2 = get_rate_limiter("test2", rate=100, per=1)  # Different params ignored
        
        assert limiter1 is limiter2
