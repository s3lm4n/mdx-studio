"""Safe, deterministic GROMACS discovery."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

WhichFunction = Callable[[str], str | None]
RunFunction = Callable[..., subprocess.CompletedProcess[str]]

_FIELD_PATTERNS = {
    "version": re.compile(r"^[ \t]*GROMACS version:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
    "precision": re.compile(r"^[ \t]*Precision:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
    "mpi_library": re.compile(r"^[ \t]*MPI library:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
    "gpu_support": re.compile(r"^[ \t]*GPU support:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
    "gpu_fft_library": re.compile(
        r"^[ \t]*GPU FFT library:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE
    ),
    "simd": re.compile(r"^[ \t]*SIMD(?: instructions)?:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
    "cuda_runtime": re.compile(r"^[ \t]*CUDA runtime:[ \t]*(?P<value>.+?)[ \t]*$", re.MULTILINE),
}


@dataclass(frozen=True, slots=True)
class GromacsMetadata:
    version: str | None = None
    precision: str | None = None
    mpi_library: str | None = None
    gpu_support: str | None = None
    gpu_fft_library: str | None = None
    simd: str | None = None
    cuda_runtime: str | None = None


@dataclass(frozen=True, slots=True)
class GromacsDiscovery:
    detected: bool
    binary: Path | None
    metadata: GromacsMetadata
    detail: str

    @property
    def version(self) -> str | None:
        return self.metadata.version


class GromacsProvider:
    """Discover and inspect one runtime-selected GROMACS binary."""

    def __init__(
        self,
        *,
        configured_binary: str | None = None,
        timeout_seconds: float = 5.0,
        which: WhichFunction = shutil.which,
        run: RunFunction = subprocess.run,
    ) -> None:
        self._configured_binary = configured_binary
        self._timeout_seconds = timeout_seconds
        self._which = which
        self._run = run

    def discover(self) -> GromacsDiscovery:
        selected = self._select_binary()
        if isinstance(selected, GromacsDiscovery):
            return selected

        validation_error = _validate_binary(selected)
        if validation_error is not None:
            return _not_detected(selected, validation_error)

        argv = [str(selected), "--version"]
        try:
            completed = self._run(
                argv,
                capture_output=True,
                check=False,
                shell=False,
                text=True,
                timeout=self._timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            return _not_detected(
                selected,
                f"GROMACS version check timed out after {self._timeout_seconds:g} seconds.",
            )
        except OSError as error:
            return _not_detected(selected, f"GROMACS version check could not start: {error}.")

        if completed.returncode != 0:
            diagnostic = _first_diagnostic(completed.stderr, completed.stdout)
            suffix = f" {diagnostic}" if diagnostic else ""
            return _not_detected(
                selected,
                f"GROMACS version check exited with code {completed.returncode}.{suffix}",
            )

        output = _join_output(completed.stdout, completed.stderr)
        metadata = parse_version_output(output)
        if metadata.version is None:
            return _not_detected(
                selected,
                "Selected executable did not identify itself as GROMACS: no "
                "'GROMACS version:' line in its --version output.",
            )
        return GromacsDiscovery(
            detected=True,
            binary=selected,
            metadata=metadata,
            detail=_success_detail(selected, metadata),
        )

    def _select_binary(self) -> Path | GromacsDiscovery:
        if self._configured_binary is not None:
            if not self._configured_binary.strip():
                return _not_detected(
                    None, "Configured GROMACS executable (MDX_GROMACS_BIN) is set but empty."
                )
            configured = Path(self._configured_binary)
            # A relative override would be validated against the working directory but resolved
            # through PATH by exec, so the checked and executed files could differ.
            if not configured.is_absolute():
                return _not_detected(
                    configured,
                    "Configured GROMACS executable (MDX_GROMACS_BIN) must be an absolute path.",
                )
            return configured

        path_result = self._which("gmx")
        if path_result is None:
            return _not_detected(None, "GROMACS executable 'gmx' was not found on PATH.")
        # Anchor a relative PATH entry to the directory shutil.which checked, so exec cannot
        # perform a second, different PATH search.
        return Path(path_result).absolute()


def parse_version_output(output: str) -> GromacsMetadata:
    parsed: dict[str, str | None] = {}
    for field, pattern in _FIELD_PATTERNS.items():
        match = pattern.search(output)
        parsed[field] = (match.group("value").strip() or None) if match else None
    return GromacsMetadata(**parsed)


def _validate_binary(binary: Path) -> str | None:
    if not binary.exists():
        return "Selected GROMACS executable does not exist."
    if not binary.is_file():
        return "Selected GROMACS executable is not a regular file."
    if not os.access(binary, os.X_OK):
        return "Selected GROMACS executable is not executable."
    return None


def _not_detected(binary: Path | None, detail: str) -> GromacsDiscovery:
    return GromacsDiscovery(
        detected=False,
        binary=binary,
        metadata=GromacsMetadata(),
        detail=detail,
    )


def _join_output(*streams: str) -> str:
    return "\n".join(stream.strip() for stream in streams if stream.strip())


def _first_diagnostic(*streams: str) -> str:
    for stream in streams:
        for line in stream.splitlines():
            stripped = line.strip()
            if stripped:
                return stripped
    return ""


def _success_detail(binary: Path, metadata: GromacsMetadata) -> str:
    diagnostics: Sequence[tuple[str, str | None]] = (
        ("precision", metadata.precision),
        ("MPI", metadata.mpi_library),
        ("GPU", metadata.gpu_support),
        ("GPU FFT", metadata.gpu_fft_library),
        ("SIMD", metadata.simd),
        ("CUDA runtime", metadata.cuda_runtime),
    )
    values = [f"{label} {value}" for label, value in diagnostics if value is not None]
    version = f" version {metadata.version}" if metadata.version is not None else ""
    extras = f"; {', '.join(values)}" if values else ""
    return f"Detected {binary}{version}{extras}."
