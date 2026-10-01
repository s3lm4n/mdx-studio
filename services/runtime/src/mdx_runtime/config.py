"""Runtime-side configuration."""

from __future__ import annotations

import math
import os
from collections.abc import Mapping
from dataclasses import dataclass

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_DISCOVERY_TIMEOUT_SECONDS = 5.0


@dataclass(frozen=True, slots=True)
class RuntimeSettings:
    """Configuration owned by the WSL runtime process."""

    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    gromacs_binary: str | None = None
    discovery_timeout_seconds: float = DEFAULT_DISCOVERY_TIMEOUT_SECONDS

    @classmethod
    def from_environment(cls, environment: Mapping[str, str] | None = None) -> RuntimeSettings:
        values = os.environ if environment is None else environment
        return cls(
            port=_parse_port(values.get("MDX_RUNTIME_PORT")),
            # Only an absent variable means "not configured"; an empty value is an explicit,
            # invalid override that discovery must reject rather than fall back to PATH.
            gromacs_binary=values.get("MDX_GROMACS_BIN"),
            discovery_timeout_seconds=_parse_timeout(values.get("MDX_DISCOVERY_TIMEOUT_SECONDS")),
        )


def _parse_port(raw_value: str | None) -> int:
    if raw_value is None:
        return DEFAULT_PORT
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError("MDX_RUNTIME_PORT must be an integer") from error
    if not 1 <= value <= 65535:
        raise ValueError("MDX_RUNTIME_PORT must be between 1 and 65535")
    return value


def _parse_timeout(raw_value: str | None) -> float:
    if raw_value is None:
        return DEFAULT_DISCOVERY_TIMEOUT_SECONDS
    try:
        value = float(raw_value)
    except ValueError as error:
        raise ValueError("MDX_DISCOVERY_TIMEOUT_SECONDS must be a number") from error
    if not math.isfinite(value) or value <= 0:
        raise ValueError("MDX_DISCOVERY_TIMEOUT_SECONDS must be a finite number greater than zero")
    return value
