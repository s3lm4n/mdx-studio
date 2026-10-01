import dataclasses

import pytest

from mdx_runtime.config import DEFAULT_HOST, DEFAULT_PORT, RuntimeSettings

LAN_HOST = "192.168.1.50"


def test_service_binds_to_loopback_by_default() -> None:
    settings = RuntimeSettings.from_environment({})

    assert settings.host == DEFAULT_HOST == "127.0.0.1"
    assert settings.port == DEFAULT_PORT


def test_runtime_side_environment_is_loaded() -> None:
    settings = RuntimeSettings.from_environment(
        {
            "MDX_GROMACS_BIN": "/runtime/configured/gmx",
            "MDX_RUNTIME_PORT": "9001",
            "MDX_DISCOVERY_TIMEOUT_SECONDS": "2.5",
        }
    )

    assert settings.gromacs_binary == "/runtime/configured/gmx"
    assert settings.port == 9001
    assert settings.discovery_timeout_seconds == 2.5


def test_absent_gromacs_override_is_not_configured() -> None:
    assert RuntimeSettings.from_environment({}).gromacs_binary is None


@pytest.mark.parametrize("raw", ["", "   "])
def test_empty_gromacs_override_is_kept_as_explicit_configuration(raw: str) -> None:
    assert RuntimeSettings.from_environment({"MDX_GROMACS_BIN": raw}).gromacs_binary == raw


def test_host_environment_cannot_change_the_loopback_host() -> None:
    settings = RuntimeSettings.from_environment(
        {"MDX_RUNTIME_HOST": LAN_HOST, "HOST": LAN_HOST, "UVICORN_HOST": LAN_HOST}
    )

    assert settings.host == "127.0.0.1"


def test_settings_are_immutable() -> None:
    settings = RuntimeSettings.from_environment({})

    with pytest.raises(dataclasses.FrozenInstanceError):
        settings.host = LAN_HOST  # type: ignore[misc]


@pytest.mark.parametrize("raw", ["abc", "1.5", "0", "-1", "65536"])
def test_invalid_port_is_rejected(raw: str) -> None:
    with pytest.raises(ValueError, match="MDX_RUNTIME_PORT"):
        RuntimeSettings.from_environment({"MDX_RUNTIME_PORT": raw})


@pytest.mark.parametrize("raw", ["0", "-1", "inf", "-inf", "nan", "1e309", "abc"])
def test_invalid_discovery_timeout_is_rejected(raw: str) -> None:
    with pytest.raises(ValueError, match="MDX_DISCOVERY_TIMEOUT_SECONDS"):
        RuntimeSettings.from_environment({"MDX_DISCOVERY_TIMEOUT_SECONDS": raw})


def test_valid_finite_discovery_timeout_is_accepted() -> None:
    settings = RuntimeSettings.from_environment({"MDX_DISCOVERY_TIMEOUT_SECONDS": "0.25"})

    assert settings.discovery_timeout_seconds == 0.25
