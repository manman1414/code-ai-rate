"""工具函数模块"""

from typing import Optional, Dict, List


def normalize_name(name: str) -> str:
    return name.strip().lower()


def merge_dicts(a: Dict, b: Dict) -> Dict:
    result = dict(a)
    result.update(b)
    return result


def first(items: List) -> Optional[object]:
    return items[0] if items else None
