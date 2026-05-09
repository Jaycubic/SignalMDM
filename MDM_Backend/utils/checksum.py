"""
utils/checksum.py
------------------
Deterministic MD5 checksum generation for raw data rows.

Rules:
  • Dict keys are always sorted before serialisation so two dicts with
    the same content but different insertion order produce identical checksums.
  • Non-serialisable values (e.g. datetime) are coerced to str.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def _default_serialiser(obj: Any) -> str:
    """Fallback JSON serialiser — converts non-serialisable objects to str."""
    return str(obj)


def generate_checksum(data: dict[str, Any]) -> str:
    """
    Return the MD5 hex digest of the JSON-serialised *data* dict.

    Keys are sorted for determinism; values are coerced via *_default_serialiser*
    if they are not natively JSON-serialisable.

    Args:
        data: A dict representing one raw row or file payload.

    Returns:
        32-character lowercase hex string.
    """
    serialised = json.dumps(data, sort_keys=True, default=_default_serialiser)
    return hashlib.md5(serialised.encode("utf-8")).hexdigest()


def generate_file_checksum(file_bytes: bytes) -> str:
    """
    Return the MD5 hex digest of raw file bytes.

    Used to validate file integrity at upload time.
    """
    return hashlib.md5(file_bytes).hexdigest()
