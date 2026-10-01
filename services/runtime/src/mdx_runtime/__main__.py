"""Command-line entry point for the MDX runtime service."""

from __future__ import annotations

import argparse
import json
from collections.abc import Sequence

import uvicorn

from .app import create_app
from .config import RuntimeSettings
from .providers.gromacs import GromacsProvider


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="mdx-runtime")
    subcommands = parser.add_subparsers(dest="command")
    subcommands.add_parser("serve", help="start the loopback-only HTTP service")
    subcommands.add_parser("inspect", help="inspect runtime-side GROMACS discovery")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    settings = RuntimeSettings.from_environment()
    if args.command == "inspect":
        return _inspect(settings)
    return _serve(settings)


def _serve(settings: RuntimeSettings) -> int:
    uvicorn.run(create_app(settings=settings), host=settings.host, port=settings.port)
    return 0


def _inspect(settings: RuntimeSettings) -> int:
    discovery = GromacsProvider(
        configured_binary=settings.gromacs_binary,
        timeout_seconds=settings.discovery_timeout_seconds,
    ).discover()
    print(
        json.dumps(
            {
                "detected": discovery.detected,
                "binary": str(discovery.binary) if discovery.binary is not None else None,
                "version": discovery.version,
                "detail": discovery.detail,
                "metadata": {
                    "precision": discovery.metadata.precision,
                    "mpiLibrary": discovery.metadata.mpi_library,
                    "gpuSupport": discovery.metadata.gpu_support,
                    "gpuFftLibrary": discovery.metadata.gpu_fft_library,
                    "simd": discovery.metadata.simd,
                    "cudaRuntime": discovery.metadata.cuda_runtime,
                },
            },
            indent=2,
        )
    )
    return 0 if discovery.detected else 1


if __name__ == "__main__":
    raise SystemExit(main())
