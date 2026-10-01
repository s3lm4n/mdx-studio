"""FastAPI application for the Phase 2A-1 runtime surface."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

from fastapi import FastAPI

from . import IMPLEMENTATION_NAME, PROTOCOL_VERSION, __version__
from .config import RuntimeSettings
from .protocol import (
    MdxDeviceCapability,
    RuntimeCapabilities,
    RuntimeHealth,
    RuntimeVersion,
    ToolStatus,
)
from .providers.gromacs import GromacsProvider

Clock = Callable[[], datetime]


def _utc_now() -> datetime:
    return datetime.now(UTC)


def create_app(
    *,
    settings: RuntimeSettings | None = None,
    gromacs_provider: GromacsProvider | None = None,
    clock: Clock = _utc_now,
) -> FastAPI:
    runtime_settings = settings or RuntimeSettings.from_environment()
    provider = gromacs_provider or GromacsProvider(
        configured_binary=runtime_settings.gromacs_binary,
        timeout_seconds=runtime_settings.discovery_timeout_seconds,
    )
    app = FastAPI(
        title="MDX Runtime Service",
        version=__version__,
        docs_url=None,
        openapi_url=None,
        redoc_url=None,
    )

    @app.get("/health", response_model=RuntimeHealth)
    def get_health() -> RuntimeHealth:
        return RuntimeHealth(
            status="ok",
            protocol_version=PROTOCOL_VERSION,
            runtime_version=__version__,
            implementation=IMPLEMENTATION_NAME,
            origin="measured",
            checked_at=clock(),
        )

    @app.get("/capabilities", response_model=RuntimeCapabilities)
    def get_capabilities() -> RuntimeCapabilities:
        discovery = provider.discover()
        return RuntimeCapabilities(
            protocol_version=PROTOCOL_VERSION,
            origin="measured",
            run_modes=[],
            supports_stop=False,
            supports_pause=False,
            gromacs=ToolStatus(
                name="GROMACS",
                detected=discovery.detected,
                version=discovery.version,
                origin="measured",
                detail=discovery.detail,
            ),
            mdx_device=MdxDeviceCapability(integration="mock", origin="simulated"),
            mdx_profiles=[],
        )

    @app.get("/version", response_model=RuntimeVersion)
    def get_version() -> RuntimeVersion:
        return RuntimeVersion(
            protocol_version=PROTOCOL_VERSION,
            runtime_version=__version__,
            implementation=IMPLEMENTATION_NAME,
        )

    return app


app = create_app()
