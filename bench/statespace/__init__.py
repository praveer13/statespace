"""The statespace Bench CLI (spine section 9.6): the command line that checks a lab, hashes a statement
and verifies a receipt. `statespace doctor` is the first command (W0-T05).

Nothing here may import a dependency at import time: `statespace.schema` and `statespace.doctor` each
load only what they use, so the statement hash and the pin check work with the standard library alone.
"""

from importlib.metadata import PackageNotFoundError, version as _distribution_version

try:
    __version__ = _distribution_version("statespace-lab")
except PackageNotFoundError:  # run from a source tree that is not installed
    __version__ = "0+unknown"

__all__ = ["__version__"]
