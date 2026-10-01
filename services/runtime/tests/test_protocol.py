from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from mdx_runtime.protocol import (
    MdxDeviceCapability,
    MdxProfileSummary,
    ProtocolModel,
    RuntimeCapabilities,
    RuntimeHealth,
    RuntimeVersion,
    ToolStatus,
)


def _fixture(name: str) -> object:
    return json.loads((Path(__file__).parent / "fixtures" / name).read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (RuntimeHealth, _fixture("runtime-health.json")),
        (RuntimeCapabilities, _fixture("runtime-capabilities.json")),
        (
            RuntimeVersion,
            {
                "protocolVersion": "0.1.0",
                "runtimeVersion": "0.1.0",
                "implementation": "mdx-runtime-python",
            },
        ),
        (
            ToolStatus,
            {
                "name": "GROMACS",
                "detected": True,
                "version": "2026.1",
                "origin": "measured",
                "detail": None,
            },
        ),
        (MdxDeviceCapability, {"integration": "mock", "origin": "simulated"}),
        (MdxProfileSummary, {"id": "mock", "title": "Mock", "description": "Simulated"}),
    ],
)
def test_all_response_models_reject_unknown_fields(
    model: type[ProtocolModel], payload: object
) -> None:
    raw = model.model_validate(payload).model_dump(mode="json", by_alias=True)
    raw["binaryPath"] = "/unexpected/gmx"

    with pytest.raises(ValidationError) as error:
        model.model_validate(raw)

    assert [(issue["loc"], issue["type"]) for issue in error.value.errors()] == [
        (("binaryPath",), "extra_forbidden")
    ]

    with pytest.raises(ValidationError):
        model(**raw)


@pytest.mark.parametrize("field", ["gromacs", "mdxDevice", "mdxProfiles"])
def test_capabilities_reject_unknown_nested_fields(field: str) -> None:
    raw = RuntimeCapabilities.model_validate(_fixture("runtime-capabilities.json")).model_dump(
        mode="json", by_alias=True
    )
    if field == "mdxProfiles":
        raw[field] = [{"id": "mock", "title": "Mock", "description": "Simulated"}]
        raw[field][0]["binaryPath"] = "/unexpected/gmx"
        location: tuple[str | int, ...] = (field, 0, "binaryPath")
    else:
        raw[field]["binaryPath"] = "/unexpected/gmx"
        location = (field, "binaryPath")

    with pytest.raises(ValidationError) as error:
        RuntimeCapabilities.model_validate(raw)

    assert [(issue["loc"], issue["type"]) for issue in error.value.errors()] == [
        (location, "extra_forbidden")
    ]
