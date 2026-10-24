"""Second, independent check of the draft lasso@1 schema: Python jsonschema, Draft 2020-12.

Reads the same fixtures/manifest.json as check.mjs and compares only the schema verdict
(the reading rules live in lasso-read.mjs). Exits 1 when any fixture does not behave as the
manifest says.

    uv run --no-project --with jsonschema==4.26.0 python -I check_schema.py [--json]
"""

import hashlib
import importlib.metadata
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

here = Path(__file__).resolve().parent
root = here.parents[2]
manifest = json.loads((here / "fixtures" / "manifest.json").read_text())
schema_bytes = (root / manifest["schema"]).read_bytes()
schema = json.loads(schema_bytes)

Draft202012Validator.check_schema(schema)  # the schema is itself valid 2020-12
validator = Draft202012Validator(schema)

rows = []
for f in manifest["json"]:
    trace = json.loads((root / f["path"]).read_text())
    errors = sorted(validator.iter_errors(trace), key=lambda e: [str(p) for p in e.path])
    valid = not errors
    rows.append(
        {
            "id": f["id"],
            "schemaValid": valid,
            "expected": f["expect"]["schema"],
            "pass": valid == f["expect"]["schema"],
            "schemaErrors": [
                f"/{'/'.join(str(p) for p in e.absolute_path)} {e.message[:100]}" for e in errors[:3]
            ],
        }
    )

passed = all(r["pass"] for r in rows)
summary = {
    "tool": {
        "engine": "jsonschema",
        "version": importlib.metadata.version("jsonschema"),
        "dialect": "2020-12",
        "python": sys.version.split()[0],
    },
    "schema": {"path": manifest["schema"], "sha256": hashlib.sha256(schema_bytes).hexdigest()},
    "counts": {
        "fixtures": len(rows),
        "schemaValid": sum(r["schemaValid"] for r in rows),
        "schemaRejected": sum(not r["schemaValid"] for r in rows),
    },
    "pass": passed,
    "fixtures": rows,
}

if "--json" in sys.argv:
    print(json.dumps(summary, indent=2))
else:
    print(f"jsonschema {summary['tool']['version']}, Draft 2020-12; schema {manifest['schema']}")
    for r in rows:
        shape = "valid  " if r["schemaValid"] else "invalid"
        why = "" if r["schemaValid"] else f" {r['schemaErrors'][0]}"
        print(f"{'pass' if r['pass'] else 'FAIL'}  {r['id']:<30} {shape}{why}")
    print(f"all {len(rows)} fixtures behave as the manifest says" if passed else "FAILED")
sys.exit(0 if passed else 1)
