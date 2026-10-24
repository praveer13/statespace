"""Validate records against the published schemas with the ``jsonschema`` package.

``jsonschema`` is the one validator the CLI depends on (ARCHITECTURE.md section 11.2). It is imported
when a function here is first called, so the types and the statement hash work without it.
"""

from functools import lru_cache
from typing import Any, TypedDict, cast

from .schemas import SCHEMA_DOCUMENTS

__all__ = ["SCHEMA_NAMES", "ValidationIssue", "validate", "validate_record"]

SCHEMA_NAMES: list[str] = [doc["name"] for doc in SCHEMA_DOCUMENTS]


class ValidationIssue(TypedDict):
    instancePath: str  # JSON Pointer to the offending value in the record
    keyword: str  # the failing keyword, such as "required" or "pattern"
    message: str


def _find(ref: str) -> dict[str, Any]:
    for doc in SCHEMA_DOCUMENTS:
        if ref in (doc["id"], doc["name"], doc["schema"]):
            return doc["json"]
    raise KeyError(f"no published schema {ref!r}; known: {', '.join(SCHEMA_NAMES)}")


@lru_cache(maxsize=None)
def _validator(ref: str) -> Any:
    try:
        from jsonschema import Draft202012Validator
        from referencing import Registry, Resource
        from referencing.jsonschema import DRAFT202012
    except ImportError as error:  # pragma: no cover - the message is the point
        raise ImportError("validating records needs the jsonschema package: uv run --with jsonschema ...") from error
    empty: Any = Registry()  # pyright: ignore[reportUnknownVariableType, reportUnknownArgumentType]
    registry: Any = empty.with_resources(
        [(doc["id"], Resource.from_contents(doc["json"], default_specification=DRAFT202012)) for doc in SCHEMA_DOCUMENTS]
    )
    return Draft202012Validator(_find(ref), registry=registry)


def _pointer(path: Any) -> str:
    return "".join("/" + str(part).replace("~", "~0").replace("/", "~1") for part in path)


def validate(ref: str, value: Any) -> list[ValidationIssue]:
    """Validate ``value`` against a published schema, named by file name (``claim``), by ``$id`` or by its record tag.

    Returns the issues; an empty list means the value is valid.
    """
    issues = [
        ValidationIssue(instancePath=_pointer(error.absolute_path), keyword=str(error.validator), message=error.message)
        for error in _validator(ref).iter_errors(value)
    ]
    return sorted(issues, key=lambda issue: (issue["instancePath"], issue["keyword"]))


def validate_record(value: Any) -> list[ValidationIssue]:
    """Validate a record by its own ``schema`` field, such as ``statespace/claim@1``."""
    tag = cast(dict[str, Any], value).get("schema") if isinstance(value, dict) else None
    if not isinstance(tag, str) or not any(tag == doc["schema"] for doc in SCHEMA_DOCUMENTS):
        return [ValidationIssue(instancePath="/schema", keyword="schema", message="is not a published record schema")]
    return validate(tag, value)
