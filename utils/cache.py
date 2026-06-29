# utils/cache.py
from cachetools import TTLCache
from typing import Any, Optional

# Separate caches per endpoint group
# maxsize=1 because each cache holds one result (the full list)
# ttl in seconds

_class_names_cache: TTLCache = TTLCache(maxsize=1, ttl=600)       # 10 min
_teacher_names_cache: TTLCache = TTLCache(maxsize=1, ttl=600)     # 10 min
_attendance_values_cache: TTLCache = TTLCache(maxsize=1, ttl=600) # 10 min
_attendance_times_cache: TTLCache = TTLCache(maxsize=1, ttl=600)  # 10 min
_income_cats_cache: TTLCache = TTLCache(maxsize=1, ttl=600)       # 10 min
_expense_cats_cache: TTLCache = TTLCache(maxsize=1, ttl=600)      # 10 min

CACHES = {
    "class_names": _class_names_cache,
    "teacher_names": _teacher_names_cache,
    "attendance_values": _attendance_values_cache,
    "attendance_times": _attendance_times_cache,
    "income_cats": _income_cats_cache,
    "expense_cats": _expense_cats_cache,
}

def cache_get(name: str) -> Optional[Any]:
    return CACHES[name].get("data")

def cache_set(name: str, value: Any) -> None:
    CACHES[name]["data"] = value

def cache_invalidate(name: str) -> None:
    CACHES[name].clear()
