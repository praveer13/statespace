"""The Python half of GATE-schema (scripts/verify-schema.mjs runs it and compares its answers).

It reads one JSON request on stdin and writes one JSON answer on stdout. It judges nothing itself: it
reports what Python's own tools say, so that the comparison with the TypeScript side is made in one place.

  - the JSON Schema meta-schema check of every schema (jsonschema)
  - jsonschema's verdict, with each failing keyword and path, on every case Node sends
  - PyYAML's reading of the YAML fixtures, then jsonschema's verdict on what it read
  - the statement hash of every vector, through the text, bytes and file entry points of the package
  - the shape (keys, required keys) of every generated TypedDict, read back by introspection

Run it as: uv run --no-project --with jsonschema==... --with pyyaml==... python -I -B <this file>
"""

import importlib.util
import json
import re
import sys
import tempfile
from importlib import metadata
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

BENCH = Path(__file__).resolve().parents[2] / "bench"


def load_schema_package():
    """Load bench/statespace/schema as a package of its own, without running statespace/__init__.py.

    The gate runs with only jsonschema and PyYAML installed, so it must not depend on whatever the
    parent package imports.
    """
    root = BENCH / "statespace" / "schema"
    name = "statespace_schema"
    spec = importlib.util.spec_from_file_location(name, root / "__init__.py", submodule_search_locations=[str(root)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return name


PACKAGE = load_schema_package()
records = sys.modules[PACKAGE + ".records"]
schemas = sys.modules[PACKAGE + ".schemas"]
statement_hash = sys.modules[PACKAGE + ".statement_hash"]
package_validate = sys.modules[PACKAGE + ".validation"]


def pointer(path):
    return "".join("/" + str(part).replace("~", "~0").replace("/", "~1") for part in path)


def registry(extra):
    resources = [(d["id"], Resource.from_contents(d["json"], default_specification=DRAFT202012)) for d in schemas.SCHEMA_DOCUMENTS]
    for doc in extra:
        resources.append((doc["$id"], Resource.from_contents(doc, default_specification=DRAFT202012)))
    return Registry().with_resources(resources)


def judge(case, reg):
    """jsonschema's verdict on one case: {valid, errors: [{path, keyword}]}."""
    if case.get("raw") is not None:
        # The text goes through Python's own JSON parser, as a record read by the CLI would.
        case = {**case, "value": json.loads(case["raw"])}
    if case.get("schema") is not None:
        validator = Draft202012Validator(case["schema"], registry=reg)
        errors = sorted(validator.iter_errors(case["value"]), key=lambda e: (pointer(e.absolute_path), str(e.validator)))
        issues = [{"path": pointer(e.absolute_path), "keyword": str(e.validator)} for e in errors]
    else:
        # A published schema goes through the package's own wrapper, so the wrapper is tested too.
        found = package_validate.validate(case["ref"], case["value"])
        issues = [{"path": i["instancePath"], "keyword": i["keyword"]} for i in found]
    return {"valid": not issues, "errors": issues}


def shape(cls):
    """Keys in declaration order, and which are required, of a TypedDict class."""
    return {"keys": list(cls.__annotations__), "required": sorted(cls.__required_keys__)}


def introspect(namespace, names):
    out = {}
    for name in names:
        cls = namespace.get(name) if isinstance(namespace, dict) else getattr(namespace, name, None)
        if cls is None:
            out[name] = None
        elif hasattr(cls, "__required_keys__"):
            out[name] = shape(cls)
        else:
            out[name] = {"alias": True}
    return out


def vector_results(path):
    spec = json.loads(Path(path).read_text(encoding="utf-8"))
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for v in spec["vectors"]:
            row = {"id": v["id"], "text": None, "bytes": None, "file": None}

            def attempt(fn):
                try:
                    return {"hash": fn()}
                except statement_hash.StatementHashError as error:
                    return {"error": error.code}
                except Exception as error:  # noqa: BLE001 - a crash is a result the gate must report, not hide
                    return {"crash": f"{type(error).__name__}: {str(error)[:120]}"}

            if "text" in v:
                row["text"] = attempt(lambda: statement_hash.statement_hash_text(v["text"]))
            if "bytesHex" in v:
                data = bytes.fromhex(v["bytesHex"])
                row["bytes"] = attempt(lambda: statement_hash.statement_hash_bytes(data))
                file = Path(tmp) / "statement.bin"
                file.write_bytes(data)
                row["file"] = attempt(lambda: statement_hash.statement_hash_file(file))
            if "text" in v and "error" not in v:
                row["preimageHex"] = statement_hash.statement_preimage(v["text"]).hex()
            results.append(row)
    # What str.rstrip() would do, to show why the package does not use it.
    python_space = [cp for cp in range(0x110000) if ("a" + chr(cp)).rstrip() == "a"]
    return {"results": results, "rstripSet": python_space, "trimSet": list(statement_hash.TRIM_RIGHT_CODE_POINTS)}


def main():
    request = json.load(sys.stdin)
    extra_docs = request.get("extraSchemas", [])
    reg = registry(extra_docs)

    answer = {
        "versions": {
            "python": sys.version.split()[0],
            "jsonschema": metadata.version("jsonschema"),
            "referencing": metadata.version("referencing"),
            "pyyaml": metadata.version("PyYAML"),
        },
    }

    meta = []
    for doc in [d["json"] for d in schemas.SCHEMA_DOCUMENTS] + extra_docs:
        try:
            Draft202012Validator.check_schema(doc)
            meta.append({"id": doc["$id"], "ok": True})
        except Exception as error:  # noqa: BLE001 - report whatever jsonschema raises
            meta.append({"id": doc["$id"], "ok": False, "error": str(error)[:300]})
    answer["metaschema"] = meta

    answer["cases"] = [judge(case, reg) for case in request["cases"]]

    # How re.search reads patterns, to compare with ECMAScript's reading of the same text.
    answer["probes"] = [bool(re.search(p["pattern"], p["text"])) for p in request.get("probes", [])]

    yaml_out = []
    for item in request["yamlFiles"]:
        path = Path(item["path"])
        try:
            doc = yaml.safe_load(path.read_text(encoding="utf-8"))
            json.dumps(doc)  # a value JSON cannot hold (a date, a set) is an error in the record
        except Exception as error:  # noqa: BLE001
            yaml_out.append({"path": item["path"], "error": str(error)[:300]})
            continue
        yaml_out.append({"path": item["path"], "doc": doc, "verdict": judge({"ref": item["ref"], "value": doc}, reg)})
    answer["yaml"] = yaml_out

    answer["vectors"] = vector_results(request["vectors"])

    answer["types"] = introspect(records, request["typeNames"])
    answer["recordTypes"] = {tag: cls.__name__ for tag, cls in records.RECORD_TYPES.items()}
    answer["schemaTypes"] = {name: cls.__name__ for name, cls in records.SCHEMA_TYPES.items()}
    selftest = request.get("selftestRecords")
    if selftest:
        namespace = {}
        exec(compile(selftest, "selftest_records", "exec"), namespace)  # generated by our own generator
        answer["selftestTypes"] = introspect(namespace, request["selftestTypeNames"])
        answer["selftestRecordTypes"] = {tag: cls.__name__ for tag, cls in namespace["RECORD_TYPES"].items()}
        answer["selftestSchemaTypes"] = {name: cls.__name__ for name, cls in namespace["SCHEMA_TYPES"].items()}

    json.dump(answer, sys.stdout)


main()
