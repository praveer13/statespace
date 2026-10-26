"""Reads each scalar of a corpus as PyYAML does, for pyyaml-fuzz.mjs.

  uv run --no-project --quiet --with pyyaml==6.0.3 python -I -B pyyaml-read.py corpus.json > readings.json

For each text it writes null when PyYAML cannot read `x: <text>` as a mapping of one key (a syntax error, or a tag
it has no constructor for, such as a plain `<<` or `=`), and otherwise [kind, value]: kind is null, bool, number,
str or date, and a number or a date is written so JSON can hold it.
"""

import datetime
import json
import math
import sys

import yaml

corpus = json.load(open(sys.argv[1], encoding="utf-8"))
out = []
for text in corpus:
    try:
        doc = yaml.safe_load("x: " + text + "\n")
    except Exception:  # noqa: BLE001 - any failure to read is the answer: null
        out.append(None)
        continue
    if not isinstance(doc, dict) or list(doc.keys()) != ["x"]:
        out.append(None)
        continue
    v = doc["x"]
    if v is None:
        out.append(["null", None])
    elif isinstance(v, bool):
        out.append(["bool", v])
    elif isinstance(v, int):
        out.append(["number", v])
    elif isinstance(v, float):
        out.append(["number", "nan" if math.isnan(v) else ("inf" if v > 0 else "-inf") if math.isinf(v) else v])
    elif isinstance(v, str):
        out.append(["str", v])
    elif isinstance(v, (datetime.date, datetime.datetime)):
        out.append(["date", v.isoformat()])
    else:
        out.append(["other", repr(v)])
json.dump(out, sys.stdout)
