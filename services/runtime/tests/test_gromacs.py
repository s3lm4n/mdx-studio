from __future__ import annotations

import stat
import subprocess
from pathlib import Path
from unittest.mock import Mock

import pytest

from mdx_runtime.config import RuntimeSettings
from mdx_runtime.providers.gromacs import GromacsMetadata, GromacsProvider, parse_version_output

GROMACS_2026_OUTPUT = """
                         :-) GROMACS - gmx, 2026.1 (-:

GROMACS version:     2026.1
Precision:           mixed
MPI library:         thread_mpi
OpenMP support:      enabled (GMX_OPENMP_MAX_THREADS = 128)
GPU support:         CUDA
SIMD instructions:   AVX2_256
GPU FFT library:     cuFFT
CUDA runtime:        12.60
CUDA compiler:       12.6
"""


def _executable(path: Path) -> Path:
    path.write_text("fake executable", encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return path


def _successful_run(output: str = GROMACS_2026_OUTPUT) -> Mock:
    return Mock(return_value=subprocess.CompletedProcess([], 0, stdout=output, stderr=""))


def test_gromacs_found_through_path_uses_exact_path_result(tmp_path: Path) -> None:
    path_binary = _executable(tmp_path / "path-gmx")
    _executable(tmp_path / "newer-gmx")
    which = Mock(return_value=str(path_binary))
    run = _successful_run()

    result = GromacsProvider(which=which, run=run).discover()

    assert result.detected is True
    assert result.binary == path_binary
    which.assert_called_once_with("gmx")
    assert run.call_args.args[0] == [str(path_binary), "--version"]


def test_configured_binary_override_precedes_path(tmp_path: Path) -> None:
    configured = _executable(tmp_path / "configured-gmx")
    which = Mock(side_effect=AssertionError("PATH lookup must not run for an override"))
    run = _successful_run()

    result = GromacsProvider(
        configured_binary=str(configured),
        which=which,
        run=run,
    ).discover()

    assert result.detected is True
    assert result.binary == configured
    which.assert_not_called()


def test_missing_binary_is_not_detected() -> None:
    run = Mock(side_effect=AssertionError("subprocess must not run"))

    result = GromacsProvider(which=Mock(return_value=None), run=run).discover()

    assert result.detected is False
    assert result.binary is None
    assert result.version is None
    assert "not found on PATH" in result.detail
    run.assert_not_called()


def test_invalid_override_does_not_fall_back_to_path(tmp_path: Path) -> None:
    missing = tmp_path / "missing-gmx"
    which = Mock(side_effect=AssertionError("invalid override must not fall back"))
    run = Mock(side_effect=AssertionError("invalid binary must not execute"))

    result = GromacsProvider(
        configured_binary=str(missing),
        which=which,
        run=run,
    ).discover()

    assert result.detected is False
    assert result.binary == missing
    assert "does not exist" in result.detail
    which.assert_not_called()
    run.assert_not_called()


def test_non_executable_override_is_rejected(tmp_path: Path) -> None:
    binary = tmp_path / "gmx"
    binary.write_text("not executable", encoding="utf-8")
    binary.chmod(stat.S_IRUSR | stat.S_IWUSR)

    result = GromacsProvider(
        configured_binary=str(binary),
        run=Mock(side_effect=AssertionError("invalid binary must not execute")),
    ).discover()

    assert result.detected is False
    assert "not executable" in result.detail


def test_parses_2026_version_and_optional_metadata() -> None:
    metadata = parse_version_output(GROMACS_2026_OUTPUT)

    assert metadata.version == "2026.1"
    assert metadata.precision == "mixed"
    assert metadata.mpi_library == "thread_mpi"
    assert metadata.gpu_support == "CUDA"
    assert metadata.gpu_fft_library == "cuFFT"
    assert metadata.simd == "AVX2_256"
    assert metadata.cuda_runtime == "12.60"


def test_missing_optional_fields_are_not_faked() -> None:
    metadata = parse_version_output("GROMACS version: 2026.1\n")

    assert metadata.version == "2026.1"
    assert metadata.precision is None
    assert metadata.gpu_support is None
    assert metadata.cuda_runtime is None


def test_subprocess_timeout_is_controlled(tmp_path: Path) -> None:
    binary = _executable(tmp_path / "gmx")
    run = Mock(side_effect=subprocess.TimeoutExpired([str(binary), "--version"], 1.25))

    result = GromacsProvider(
        configured_binary=str(binary),
        timeout_seconds=1.25,
        run=run,
    ).discover()

    assert result.detected is False
    assert "timed out after 1.25 seconds" in result.detail


def test_nonzero_exit_is_not_detected(tmp_path: Path) -> None:
    binary = _executable(tmp_path / "gmx")
    run = Mock(
        return_value=subprocess.CompletedProcess(
            [],
            2,
            stdout="",
            stderr="installation is incomplete\n",
        )
    )

    result = GromacsProvider(configured_binary=str(binary), run=run).discover()

    assert result.detected is False
    assert result.version is None
    assert "exited with code 2" in result.detail
    assert "installation is incomplete" in result.detail


def test_version_check_never_uses_a_shell(tmp_path: Path) -> None:
    binary = _executable(tmp_path / "gmx")
    run = _successful_run()

    GromacsProvider(configured_binary=str(binary), run=run).discover()

    assert run.call_args.kwargs["shell"] is False
    assert run.call_args.kwargs["timeout"] == 5.0
    assert run.call_args.kwargs["capture_output"] is True


def test_absolute_override_executes_exactly_that_file(tmp_path: Path) -> None:
    configured = _executable(tmp_path / "gmx")
    run = _successful_run()

    result = GromacsProvider(configured_binary=str(configured), run=run).discover()

    assert result.detected is True
    assert result.binary == configured
    run.assert_called_once()
    assert run.call_args.args == ([str(configured), "--version"],)


def test_relative_override_is_invalid_and_never_executes_any_candidate(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    working_directory = tmp_path / "cwd"
    working_directory.mkdir()
    _executable(working_directory / "gmx")
    path_directory = tmp_path / "path"
    path_directory.mkdir()
    path_gmx = _executable(path_directory / "gmx")
    monkeypatch.chdir(working_directory)
    monkeypatch.setenv("PATH", str(path_directory))
    which = Mock(return_value=str(path_gmx))
    run = Mock(side_effect=AssertionError("no candidate may execute"))

    result = GromacsProvider(configured_binary="gmx", which=which, run=run).discover()

    assert result.detected is False
    assert result.binary == Path("gmx")
    assert result.version is None
    assert "must be an absolute path" in result.detail
    which.assert_not_called()
    run.assert_not_called()


def _provider_from_environment(
    environment: dict[str, str], *, which: Mock, run: Mock
) -> GromacsProvider:
    settings = RuntimeSettings.from_environment(environment)
    return GromacsProvider(configured_binary=settings.gromacs_binary, which=which, run=run)


def test_absent_override_uses_path_discovery(tmp_path: Path) -> None:
    path_binary = _executable(tmp_path / "gmx")
    which = Mock(return_value=str(path_binary))
    run = _successful_run()

    result = _provider_from_environment({}, which=which, run=run).discover()

    assert result.detected is True
    assert result.binary == path_binary
    which.assert_called_once_with("gmx")
    assert run.call_args.args[0] == [str(path_binary), "--version"]


@pytest.mark.parametrize("empty", ["", "   "])
def test_empty_override_is_invalid_and_does_not_fall_back_to_path(empty: str) -> None:
    which = Mock(side_effect=AssertionError("empty override must not fall back to PATH"))
    run = Mock(side_effect=AssertionError("empty override must not execute"))

    result = _provider_from_environment({"MDX_GROMACS_BIN": empty}, which=which, run=run).discover()

    assert result.detected is False
    assert result.binary is None
    assert result.version is None
    assert "set but empty" in result.detail
    which.assert_not_called()
    run.assert_not_called()


@pytest.mark.parametrize("relative", ["gmx", "./gmx", "bin/gmx"])
def test_every_relative_override_form_is_invalid(relative: str) -> None:
    run = Mock(side_effect=AssertionError("relative override must not execute"))

    result = GromacsProvider(configured_binary=relative, run=run).discover()

    assert result.detected is False
    assert "must be an absolute path" in result.detail
    run.assert_not_called()


def test_relative_path_lookup_result_is_anchored_before_execution(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    binary = _executable(tmp_path / "gmx")
    monkeypatch.chdir(tmp_path)
    run = _successful_run()

    result = GromacsProvider(which=Mock(return_value="gmx"), run=run).discover()

    assert result.binary == binary
    assert run.call_args.args[0] == [str(binary), "--version"]


def test_directory_override_is_not_a_regular_file(tmp_path: Path) -> None:
    result = GromacsProvider(
        configured_binary=str(tmp_path),
        run=Mock(side_effect=AssertionError("directory must not execute")),
    ).discover()

    assert result.detected is False
    assert "not a regular file" in result.detail


def test_version_check_start_failure_is_not_detected(tmp_path: Path) -> None:
    binary = _executable(tmp_path / "gmx")
    run = Mock(side_effect=OSError(8, "Exec format error"))

    result = GromacsProvider(configured_binary=str(binary), run=run).discover()

    assert result.detected is False
    assert result.version is None
    assert "could not start" in result.detail
    assert "Exec format error" in result.detail


@pytest.mark.parametrize(
    "output",
    ["", "usage: true\n", "GROMACS version:   \n", "GROMACS version:\nPrecision: mixed\n"],
)
def test_successful_exit_without_gromacs_version_is_not_detected(
    tmp_path: Path, output: str
) -> None:
    binary = _executable(tmp_path / "true")

    result = GromacsProvider(configured_binary=str(binary), run=_successful_run(output)).discover()

    assert result.detected is False
    assert result.version is None
    assert result.metadata == GromacsMetadata()
    assert "did not identify itself as GROMACS" in result.detail
