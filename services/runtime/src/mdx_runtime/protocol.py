"""Python response models for the Phase 2A-1 protocol surface."""

from __future__ import annotations

from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict

Origin = Literal["simulated", "measured"]
RunMode = Literal["native", "mdx", "validation"]


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ProtocolModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        extra="forbid",
        frozen=True,
        populate_by_name=True,
    )


class ToolStatus(ProtocolModel):
    name: str
    detected: bool
    version: str | None
    origin: Origin
    detail: str | None


class RuntimeHealth(ProtocolModel):
    status: Literal["ok", "degraded", "unavailable"]
    protocol_version: str
    runtime_version: str
    implementation: str
    origin: Origin
    checked_at: AwareDatetime


class MdxProfileSummary(ProtocolModel):
    id: str
    title: str
    description: str


class MdxDeviceCapability(ProtocolModel):
    integration: Literal["mock", "hardware"]
    origin: Origin


class RuntimeCapabilities(ProtocolModel):
    protocol_version: str
    origin: Origin
    run_modes: list[RunMode]
    supports_stop: bool
    supports_pause: bool
    gromacs: ToolStatus
    mdx_device: MdxDeviceCapability
    mdx_profiles: list[MdxProfileSummary]


class RuntimeVersion(ProtocolModel):
    protocol_version: str
    runtime_version: str
    implementation: str
