from __future__ import annotations

import json
from pathlib import Path
from typing import Any, ClassVar
from unittest.mock import Mock

import pytest
import uvicorn

from mdx_runtime import __main__ as cli
from mdx_runtime.providers.gromacs import GromacsDiscovery, GromacsMetadata

LAN_HOST = "192.168.1.50"
RUNTIME_VARIABLES = ("MDX_GROMACS_BIN", "MDX_RUNTIME_PORT", "MDX_DISCOVERY_TIMEOUT_SECONDS")


@pytest.fixture(autouse=True)
def _clean_runtime_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in RUNTIME_VARIABLES:
        monkeypatch.delenv(name, raising=False)


class _RecordingProvider:
    """Stands in for GromacsProvider and records the runtime settings it was built with."""

    instances: ClassVar[list[_RecordingProvider]] = []
    discovery: ClassVar[GromacsDiscovery] = GromacsDiscovery(
        detected=True,
        binary=Path("/opt/gromacs/bin/gmx"),
        metadata=GromacsMetadata(version="2026.1", precision="mixed"),
        detail="Detected /opt/gromacs/bin/gmx version 2026.1; precision mixed.",
    )

    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs
        _RecordingProvider.instances.append(self)

    def discover(self) -> GromacsDiscovery:
        return self.discovery


@pytest.fixture
def recording_provider(monkeypatch: pytest.MonkeyPatch) -> type[_RecordingProvider]:
    _RecordingProvider.instances = []
    monkeypatch.setattr(cli, "GromacsProvider", _RecordingProvider)
    return _RecordingProvider


def test_inspect_reports_runtime_side_discovery(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    recording_provider: type[_RecordingProvider],
) -> None:
    monkeypatch.setenv("MDX_GROMACS_BIN", "/opt/gromacs/bin/gmx")
    monkeypatch.setenv("MDX_DISCOVERY_TIMEOUT_SECONDS", "2.5")

    exit_code = cli.main(["inspect"])

    assert exit_code == 0
    [provider] = recording_provider.instances
    assert provider.kwargs == {
        "configured_binary": "/opt/gromacs/bin/gmx",
        "timeout_seconds": 2.5,
    }
    assert json.loads(capsys.readouterr().out) == {
        "detected": True,
        "binary": "/opt/gromacs/bin/gmx",
        "version": "2026.1",
        "detail": "Detected /opt/gromacs/bin/gmx version 2026.1; precision mixed.",
        "metadata": {
            "precision": "mixed",
            "mpiLibrary": None,
            "gpuSupport": None,
            "gpuFftLibrary": None,
            "simd": None,
            "cudaRuntime": None,
        },
    }


def test_inspect_exits_nonzero_when_gromacs_is_not_detected(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("MDX_GROMACS_BIN", "gmx")

    exit_code = cli.main(["inspect"])

    report = json.loads(capsys.readouterr().out)
    assert exit_code == 1
    assert report["detected"] is False
    assert report["binary"] == "gmx"
    assert report["version"] is None
    assert "must be an absolute path" in report["detail"]


@pytest.mark.parametrize("argv", [["serve"], []])
def test_serve_binds_uvicorn_to_loopback(monkeypatch: pytest.MonkeyPatch, argv: list[str]) -> None:
    run = Mock()
    monkeypatch.setattr(uvicorn, "run", run)
    monkeypatch.setenv("MDX_RUNTIME_HOST", LAN_HOST)
    monkeypatch.setenv("HOST", LAN_HOST)
    monkeypatch.setenv("MDX_RUNTIME_PORT", "9001")

    exit_code = cli.main(argv)

    assert exit_code == 0
    run.assert_called_once()
    assert run.call_args.kwargs == {"host": "127.0.0.1", "port": 9001}


def test_invalid_runtime_configuration_fails_before_serving(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run = Mock(side_effect=AssertionError("must not serve with invalid configuration"))
    monkeypatch.setattr(uvicorn, "run", run)
    monkeypatch.setenv("MDX_DISCOVERY_TIMEOUT_SECONDS", "inf")

    with pytest.raises(ValueError, match="MDX_DISCOVERY_TIMEOUT_SECONDS"):
        cli.main(["serve"])

    run.assert_not_called()
