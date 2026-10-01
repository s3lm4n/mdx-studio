"""MDX Studio's local WSL runtime service."""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("mdx-runtime")
except PackageNotFoundError:
    __version__ = "0.1.0"

PROTOCOL_VERSION = "0.1.0"
IMPLEMENTATION_NAME = "mdx-runtime-python"

__all__ = ["IMPLEMENTATION_NAME", "PROTOCOL_VERSION", "__version__"]
