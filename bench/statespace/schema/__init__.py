"""Types, validation and the statement hash for the course's records.

Everything here follows the one JSON Schema source in ``schemas/``: ``records`` and ``schemas`` are
generated from it by ``node schemas/codegen/generate.mjs``, and GATE-schema fails when they are stale.
"""

from . import records
from .records import *  # noqa: F401,F403
from .schemas import SCHEMA_DIGEST, SCHEMA_DOCUMENTS
from .statement_hash import (
    STATEMENT_HASH_SPEC_ID,
    StatementHashError,
    statement_hash_bytes,
    statement_hash_file,
    statement_hash_text,
    statement_preimage,
    statement_text,
    trim_right,
)
from .validation import SCHEMA_NAMES, ValidationIssue, validate, validate_record

__all__: list[str] = []
__all__ += records.__all__
__all__ += [
    "SCHEMA_DIGEST",
    "SCHEMA_DOCUMENTS",
    "SCHEMA_NAMES",
    "STATEMENT_HASH_SPEC_ID",
    "StatementHashError",
    "ValidationIssue",
    "statement_hash_bytes",
    "statement_hash_file",
    "statement_hash_text",
    "statement_preimage",
    "statement_text",
    "trim_right",
    "validate",
    "validate_record",
]
