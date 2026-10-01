from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import Mock

from fastapi.testclient import TestClient

from mdx_runtime.app import create_app
from mdx_runtime.providers.gromacs import (
    GromacsDiscovery,
    GromacsMetadata,
    GromacsProvider,
)

FIXTURES = Path(__file__).parent / "fixtures"
FIXED_TIME = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)


class FixtureGromacsProvider(GromacsProvider):
    def discover(self) -> GromacsDiscovery:
        return GromacsDiscovery(
            detected=True,
            binary=Path("/opt/gromacs/bin/gmx"),
            metadata=GromacsMetadata(
                version="2026.1",
                precision="mixed",
                mpi_library="thread_mpi",
                gpu_support="CUDA",
                gpu_fft_library="cuFFT",
                simd="AVX2_256",
                cuda_runtime="12.60",
            ),
            detail=(
                "Detected /opt/gromacs/bin/gmx version 2026.1; precision mixed, "
                "MPI thread_mpi, GPU CUDA, GPU FFT cuFFT, SIMD AVX2_256, "
                "CUDA runtime 12.60."
            ),
        )


def _client(provider: GromacsProvider | None = None) -> TestClient:
    return TestClient(
        create_app(
            gromacs_provider=provider or FixtureGromacsProvider(),
            clock=lambda: FIXED_TIME,
        )
    )


def _fixture(name: str) -> object:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_health_matches_protocol_fixture() -> None:
    response = _client().get("/health")

    assert response.status_code == 200
    assert response.json() == _fixture("runtime-health.json")
    assert set(response.json()) == {
        "status",
        "protocolVersion",
        "runtimeVersion",
        "implementation",
        "origin",
        "checkedAt",
    }


def test_health_is_ok_without_gromacs_discovery() -> None:
    provider = Mock(spec=GromacsProvider)
    provider.discover.side_effect = AssertionError("health must not perform tool discovery")

    response = _client(provider).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    provider.discover.assert_not_called()


def test_capabilities_match_protocol_fixture() -> None:
    response = _client().get("/capabilities")

    assert response.status_code == 200
    assert response.json() == _fixture("runtime-capabilities.json")


def test_real_service_reports_measured_runtime_and_gromacs() -> None:
    capabilities = _client().get("/capabilities").json()

    assert capabilities["origin"] == "measured"
    assert capabilities["gromacs"]["origin"] == "measured"
    assert capabilities["gromacs"]["detected"] is True
    assert capabilities["gromacs"]["version"] == "2026.1"
    assert capabilities["runModes"] == []
    assert capabilities["supportsStop"] is False
    assert capabilities["supportsPause"] is False


def test_mdx_remains_explicitly_mock_and_simulated() -> None:
    capabilities = _client().get("/capabilities").json()

    assert capabilities["mdxDevice"] == {
        "integration": "mock",
        "origin": "simulated",
    }
    assert capabilities["mdxProfiles"] == []


def test_capabilities_report_missing_gromacs_without_degrading_health() -> None:
    provider = GromacsProvider(which=Mock(return_value=None))
    client = _client(provider)

    assert client.get("/health").json()["status"] == "ok"
    capabilities = client.get("/capabilities").json()
    assert capabilities["gromacs"]["detected"] is False
    assert capabilities["gromacs"]["version"] is None


def test_version_endpoint_and_unknown_route() -> None:
    client = _client()

    assert client.get("/version").json() == {
        "protocolVersion": "0.1.0",
        "runtimeVersion": "0.1.0",
        "implementation": "mdx-runtime-python",
    }
    assert client.get("/commands").status_code == 404
    assert client.get("/openapi.json").status_code == 404
