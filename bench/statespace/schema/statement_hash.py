"""The statement hash, statement-hash@1.

SHA-256 over a statement's text with trailing whitespace removed plus one newline, the rule of
Comparator Live's challenge hash, ``sha256(challenge.trimRight() + "\\n")``.

The one written specification is ``x-statementHash`` in ``schemas/defs.schema.json``. This module and
the TypeScript implementation (``packages/schema/src/statement-hash.ts``) follow it and are tested
against the same vectors, ``schemas/vectors/statement-hash.json``, by GATE-schema.

``str.rstrip()`` is not used anywhere: it removes U+001C to U+001F and U+0085, which ECMAScript keeps,
and keeps U+FEFF, which ECMAScript removes. The trimmed set comes from the schema.

No dependencies beyond the standard library.
"""

import hashlib
from pathlib import Path

from ._statement_hash_spec import STATEMENT_HASH_SPEC_ID, TRIM_RIGHT_CODE_POINTS

__all__ = [
    "STATEMENT_HASH_SPEC_ID",
    "StatementHashError",
    "statement_hash_bytes",
    "statement_hash_file",
    "statement_hash_text",
    "statement_preimage",
    "statement_text",
    "trim_right",
]

_TRIM_RIGHT = frozenset(chr(cp) for cp in TRIM_RIGHT_CODE_POINTS)


class StatementHashError(ValueError):
    """A statement that cannot be hashed. ``code`` is ``invalid-utf8`` or ``ill-formed-text``."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def trim_right(text: str) -> str:
    """Remove trailing code points listed in the specification, repeatedly."""
    end = len(text)
    while end > 0 and text[end - 1] in _TRIM_RIGHT:
        end -= 1
    return text[:end]


def _assert_well_formed(text: str) -> None:
    for index, char in enumerate(text):
        if 0xD800 <= ord(char) <= 0xDFFF:
            raise StatementHashError("ill-formed-text", f"a lone surrogate at index {index}")


def statement_text(text: str) -> str:
    """The text that is hashed: ``trim_right(text)`` followed by one U+000A."""
    _assert_well_formed(text)
    return trim_right(text) + "\n"


def statement_preimage(text: str) -> bytes:
    """The UTF-8 bytes that are hashed."""
    return statement_text(text).encode("utf-8")


def statement_hash_text(text: str) -> str:
    """The statement hash of a string, as 64 lowercase hexadecimal digits."""
    return hashlib.sha256(statement_preimage(text)).hexdigest()


def statement_hash_bytes(data: bytes) -> str:
    """The statement hash of a file's bytes: strict UTF-8, a leading byte order mark kept, no line-ending translation."""
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise StatementHashError("invalid-utf8", "the statement is not valid UTF-8") from error
    return statement_hash_text(text)


def statement_hash_file(path: "str | Path") -> str:
    """The statement hash of a file. The file is read as bytes, so line endings are never translated."""
    return statement_hash_bytes(Path(path).read_bytes())
